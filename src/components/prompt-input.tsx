'use client';

import React, { useState, ChangeEvent, FormEvent } from 'react';
import Image from 'next/image';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';

interface PromptInputProps {
  onSubmit: (data: { prompt: string; imageDataUri?: string; stylePreset?: string }) => void;
  isLoading?: boolean;
}

const stylePresets = [
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'anime', label: 'Anime' },
  { value: 'documentary', label: 'Documentary' },
  { value: 'lo-fi', label: 'Lo-fi Aesthetic' },
  { value: 'vintage', label: 'Vintage Film' },
  { value: 'sci-fi-generic', label: 'Sci-Fi Generic' },
  { value: 'fantasy-epic', label: 'Fantasy Epic' },
  { value: 'noir', label: 'Classic Noir' },
  { value: 'a24', label: 'A24 Cinematic' },
  { value: 'afrofuturist-urban', label: 'Afrofuturist Urban' },
];

export function PromptInput({ onSubmit, isLoading }: PromptInputProps) {
  const [prompt, setPrompt] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [stylePreset, setStylePreset] = useState<string | undefined>(undefined);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImageFile(null);
      setImagePreviewUrl(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!prompt.trim() && !imageFile) {
      alert('Please enter a prompt or upload an image.');
      return;
    }

    let imageDataUri: string | undefined = undefined;
    if (imageFile) {
      imageDataUri = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(imageFile);
      });
    }
    onSubmit({ prompt, imageDataUri, stylePreset });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="prompt-text">Your Prompt</Label>
        <Textarea
          id="prompt-text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your vision... e.g., 'A lone astronaut discovers an ancient alien artifact on a desolate moon.'"
          rows={4}
          className="resize-none"
          disabled={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="image-upload">Optional: Upload Reference Image</Label>
          <Input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-foreground file:text-primary hover:file:bg-primary/90"
            disabled={isLoading}
          />
          {imagePreviewUrl && (
            <div className="mt-4">
              <Image
                src={imagePreviewUrl}
                alt="Image preview"
                className="rounded-md max-h-40 w-auto object-cover shadow-md"
                width={160} // You can adjust these values as needed
                height={160} // Or make them dynamic based on layout
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="style-preset">Optional: Select Style Preset</Label>
          <Select value={stylePreset} onValueChange={setStylePreset} disabled={isLoading}>
            <SelectTrigger id="style-preset">
              <SelectValue placeholder="Choose a style..." />
            </SelectTrigger>
            <SelectContent>
              {stylePresets.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" className="w-full md:w-auto" disabled={isLoading}>
        {isLoading ? 'Generating...' : 'Generate Prototype'}
      </Button>
    </form>
  );
}
