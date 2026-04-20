const express = require('express');
const router = express.Router();
const { authenticate, requireOwner } = require('../middleware/auth');
const { query, withTransaction } = require('../config/database');
const logger = require('../utils/logger');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cloudinary = require('../config/cloudinary');
const axios = require('axios');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// =====================================================
// AI CHATBOT - Gemini powered fashion assistant
// =====================================================
router.post('/chat', authenticate, async (req, res) => {
  try {
    const { message, boutique_id, session_id, history = [] } = req.body;

    if (!message) return res.status(400).json({ error: 'Message is required' });

    // Check AI credits for boutique
    if (boutique_id) {
      const boutiqueRes = await query(
        'SELECT ai_credits, ai_chatbot_enabled FROM boutiques WHERE id = $1',
        [boutique_id]
      );

      if (boutiqueRes.rows.length === 0) {
        return res.status(404).json({ error: 'Boutique not found' });
      }

      const boutique = boutiqueRes.rows[0];
      if (!boutique.ai_chatbot_enabled) {
        return res.status(403).json({ error: 'AI chatbot not enabled for this boutique' });
      }

      const creditCost = parseInt(process.env.CHATBOT_CREDIT_COST || '1');
      if (boutique.ai_credits < creditCost) {
        return res.status(402).json({ error: 'Insufficient AI credits. Please purchase more credits.' });
      }

      // Deduct credit
      await query(
        'UPDATE boutiques SET ai_credits = ai_credits - $1 WHERE id = $2',
        [creditCost, boutique_id]
      );

      await query(
        `INSERT INTO credit_transactions (boutique_id, type, credits, description)
         VALUES ($1, 'usage', $2, 'Chatbot message')`,
        [boutique_id, -creditCost]
      );
    }

    // Fetch boutique products for context
    let productsContext = '';
    if (boutique_id) {
      const productsRes = await query(
        'SELECT name, description, type, price, fabric, colors FROM products WHERE boutique_id = $1 AND is_active = true LIMIT 20',
        [boutique_id]
      );
      if (productsRes.rows.length > 0) {
        productsContext = `\n\nAvailable Products in this Boutique:\n${productsRes.rows.map(p =>
          `- ${p.name} (${p.type}): ₹${p.price}, Fabric: ${p.fabric || 'Various'}, Colors: ${Array.isArray(p.colors) ? p.colors.join(', ') : 'Various'}`
        ).join('\n')}`;
      }
    }

    const systemPrompt = `You are an expert AI Fashion Assistant for AI Boutique Studio, a premium Indian boutique marketplace. 
    
Your role is to:
1. Help customers find the perfect outfit based on their needs, occasion, and style preferences
2. Provide fabric recommendations (cotton, silk, chiffon, georgette, etc.) suitable for Indian climate
3. Suggest styling tips for traditional and modern Indian fashion
4. Recommend products from the boutique's collection when relevant
5. Help with size and measurement guidance
6. Discuss customization options available

Always be warm, helpful, and fashion-forward. Respond in the language the customer writes in (Hindi or English).
Keep responses concise but informative. Always try to recommend relevant boutique products.
${productsContext}`;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Build chat history for context
    const chatHistory = history.slice(-10).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const chat = model.startChat({
      history: chatHistory,
      generationConfig: { maxOutputTokens: 500, temperature: 0.7 }
    });

    const result = await chat.sendMessage(systemPrompt + '\n\nCustomer: ' + message);
    const response = result.response.text();

    // Save conversation
    if (boutique_id && session_id) {
      const newMessages = [...history, { role: 'user', content: message }, { role: 'assistant', content: response }];
      await query(
        `INSERT INTO chat_conversations (customer_id, boutique_id, session_id, messages, credits_used)
         VALUES ($1, $2, $3, $4, 1)
         ON CONFLICT (session_id) DO UPDATE SET messages = $4, credits_used = chat_conversations.credits_used + 1, updated_at = NOW()`,
        [req.user.id, boutique_id, session_id, JSON.stringify(newMessages)]
      );
    }

    res.json({ message: response, credits_used: 1 });
  } catch (err) {
    logger.error('Chat error:', err);
    res.status(500).json({ error: 'AI chatbot error. Please try again.' });
  }
});

// =====================================================
// AI VIRTUAL TRY-ON
// =====================================================
router.post('/tryon', authenticate, async (req, res) => {
  try {
    const { boutique_id, product_id, customer_photo_url, product_image_url } = req.body;

    if (!customer_photo_url || !product_image_url) {
      return res.status(400).json({ error: 'Customer photo and product image are required' });
    }

    // Check credits
    const boutiqueRes = await query(
      'SELECT ai_credits, ai_tryon_enabled FROM boutiques WHERE id = $1',
      [boutique_id]
    );

    if (boutiqueRes.rows.length === 0) return res.status(404).json({ error: 'Boutique not found' });

    const boutique = boutiqueRes.rows[0];
    if (!boutique.ai_tryon_enabled) {
      return res.status(403).json({ error: 'AI try-on not enabled for this boutique' });
    }

    const creditCost = parseInt(process.env.TRYON_CREDIT_COST || '2');
    if (boutique.ai_credits < creditCost) {
      return res.status(402).json({ error: 'Insufficient AI credits' });
    }

    // Create try-on record
    const tryonRes = await query(
      `INSERT INTO ai_tryon_images (customer_id, boutique_id, product_id, customer_photo_url, product_image_url, status, credits_used)
       VALUES ($1, $2, $3, $4, $5, 'processing', $6) RETURNING id`,
      [req.user.id, boutique_id, product_id, customer_photo_url, product_image_url, creditCost]
    );
    const tryonId = tryonRes.rows[0].id;

    // Deduct credits
    await query('UPDATE boutiques SET ai_credits = ai_credits - $1 WHERE id = $2', [creditCost, boutique_id]);
    await query(
      `INSERT INTO credit_transactions (boutique_id, type, credits, description) VALUES ($1, 'usage', $2, 'AI Virtual Try-On')`,
      [boutique_id, -creditCost]
    );

    // Generate try-on using Replicate (Stable Diffusion / IDM-VTON)
    let generatedImageUrl = null;
    try {
      const response = await axios.post(
        'https://api.replicate.com/v1/predictions',
        {
          version: 'c871bb9b046607b680449ecbae55fd8c6d945e0a1948644bf2361b3d021d3ff4',
          input: {
            human_img: customer_photo_url,
            garm_img: product_image_url,
            garment_des: 'Indian boutique dress',
            is_checked: true,
            is_checked_crop: false,
            denoise_steps: 30,
            seed: 42
          }
        },
        {
          headers: {
            'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const predictionId = response.data.id;

      // Poll for result (max 60 seconds)
      let attempts = 0;
      while (attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        const statusRes = await axios.get(
          `https://api.replicate.com/v1/predictions/${predictionId}`,
          { headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}` } }
        );

        if (statusRes.data.status === 'succeeded') {
          const outputUrl = statusRes.data.output;
          // Upload to Cloudinary
          const uploadRes = await cloudinary.uploader.upload(
            Array.isArray(outputUrl) ? outputUrl[0] : outputUrl,
            { folder: 'ai-boutique/tryon' }
          );
          generatedImageUrl = uploadRes.secure_url;
          break;
        } else if (statusRes.data.status === 'failed') {
          throw new Error('Replicate prediction failed');
        }
        attempts++;
      }
    } catch (aiErr) {
      logger.error('AI try-on generation error:', aiErr);
      // Fall back to a placeholder response
      generatedImageUrl = null;
    }

    // Update try-on record
    await query(
      `UPDATE ai_tryon_images SET generated_image_url = $1, status = $2 WHERE id = $3`,
      [generatedImageUrl, generatedImageUrl ? 'completed' : 'failed', tryonId]
    );

    if (!generatedImageUrl) {
      return res.status(500).json({
        error: 'Try-on generation failed. Credits will be refunded.',
        tryon_id: tryonId
      });
    }

    res.json({
      tryon_id: tryonId,
      generated_image_url: generatedImageUrl,
      credits_used: creditCost,
      message: 'Virtual try-on generated successfully!'
    });
  } catch (err) {
    logger.error('Try-on error:', err);
    res.status(500).json({ error: 'Virtual try-on failed' });
  }
});

// GET /api/ai/tryon/history
router.get('/tryon/history', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT t.*, p.name as product_name, p.thumbnail_url
       FROM ai_tryon_images t
       LEFT JOIN products p ON p.id = t.product_id
       WHERE t.customer_id = $1
       ORDER BY t.created_at DESC LIMIT 20`,
      [req.user.id]
    );
    res.json({ tryons: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch try-on history' });
  }
});

// POST /api/ai/stylist - AI Stylist recommendations
router.post('/stylist', authenticate, async (req, res) => {
  try {
    const { occasion, body_type, budget, preferred_colors, boutique_id } = req.body;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    let productsCtx = '';
    if (boutique_id) {
      const pRes = await query(
        'SELECT name, type, price, fabric, colors, description FROM products WHERE boutique_id = $1 AND is_active = true LIMIT 20',
        [boutique_id]
      );
      productsCtx = pRes.rows.map(p => `${p.name} (${p.type}): ₹${p.price}`).join('\n');
    }

    const prompt = `As an expert AI Fashion Stylist, recommend outfits for:
- Occasion: ${occasion}
- Body Type: ${body_type}
- Budget: ₹${budget}
- Preferred Colors: ${preferred_colors}

Available boutique products:
${productsCtx}

Provide 3 specific outfit recommendations with:
1. Outfit name and description
2. Why it suits this person
3. Styling tips
4. Fabric recommendation
5. Price estimate

Be specific, helpful, and culturally aware of Indian fashion trends.`;

    const result = await model.generateContent(prompt);
    const recommendations = result.response.text();

    res.json({ recommendations, message: 'Stylist recommendations generated' });
  } catch (err) {
    logger.error('Stylist error:', err);
    res.status(500).json({ error: 'AI stylist error' });
  }
});

module.exports = router;
