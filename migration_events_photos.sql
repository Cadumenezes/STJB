-- Migration: Add photo_urls column to public.events table to store event images
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS photo_urls text[] DEFAULT '{}';
