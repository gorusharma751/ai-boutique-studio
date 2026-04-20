'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
export default function CouponsPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/owner/marketing'); }, []);
  return null;
}
