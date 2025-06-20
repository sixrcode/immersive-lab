'use client';

import Image from 'next/image';
import React, { FC } from 'react';
import type { PromptPackage, MoodBoardCell } from '@/lib/types'; // Assuming types are in @/lib/types
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button'; // Already imported
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Separator } from './ui/separator';

// Placeholder for a Refresh Icon.
const RefreshIcon = () => (
  // Using a simple text or a unicode character for now if SVG is too verbose for diff
  (<span className="mr-2">↻</span>)
);

// Placeholder for Download Icon
const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

// Added aria-label for better accessibility. The sectionName is used to create a descriptive label.
const RegenerateButton = ({ onClick, sectionName }: { onClick?: () => void; sectionName: string }) => (
  <Button variant="outline" size="sm" onClick={onClick} className="ml-auto print:hidden" title={`Regenerate ${sectionName}`} aria-label={`Regenerate ${sectionName}`}>
    <RefreshIcon />
    Regenerate
  </Button>
);

type OnRegenerateData = { index: number } | undefined;
type SectionKey =
  | "userInput"
  | "loglines"
  | "moodBoard"
  | "shotList"
  | "animaticDescription"
  | "pitchSummary"
  | "logline"
  | "moodBoardCell"
  | "shot";

interface PrototypeDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  promptPackage: PromptPackage;
  onRegenerate?: (section: SectionKey, data?: OnRegenerateData) => void;
}

export function PrototypeDisplay({ promptPackage, onRegenerate }: PrototypeDisplayProps) {
  if (!promptPackage) return null;

  const handleDownloadJson = () => {
    if (!promptPackage) return;

    const jsonString = JSON.stringify(promptPackage, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-package-${promptPackage.id.substring(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const {
    id, // For filename
    prompt,
    stylePreset,
    originalImageURL,
    loglines,
    moodBoard,
    shotList,
    animaticDescription,
    pitchSummary,
    userId,
    createdAt,
  } = promptPackage;

  const Section: FC<{ title: string; children: React.ReactNode; sectionKey: string; actions?: React.ReactNode }> =
    ({ title, children, sectionKey, actions }) => (
    <Card className="mb-6 print:shadow-none print:border-0">
      <CardHeader className="flex flex-row items-center">
        <CardTitle className="text-xl">{title}</CardTitle>
        {actions}
        {sectionKey !== "mainHeader" && <RegenerateButton sectionName={title} onClick={() => onRegenerate?.(sectionKey)} />}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );

  return (
    <div className="space-y-8 mt-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-2 border-b">
        <h2 className="text-2xl font-semibold">Generated Prototype</h2>
        {/* Added aria-label for enhanced clarity for assistive technologies. */}
        <Button onClick={handleDownloadJson} variant="default" size="sm" className="mt-2 sm:mt-0 print:hidden" data-testid="download-json-button" aria-label="Download prototype data as JSON file">
          <DownloadIcon />
          Download JSON
        </Button>
      </div>

      <Section title="Original Input" sectionKey="userInput">
        <div className="space-y-3">
          {prompt && <p><strong className="font-medium">Prompt:</strong> {prompt}</p>}
          {stylePreset && <p><strong className="font-medium">Style Preset:</strong> <Badge variant="secondary">{stylePreset}</Badge></p>}
          {originalImageURL && (
            <div>
              <h3 className="font-medium mb-2">Uploaded Image:</h3>
              <Image
                src={originalImageURL}
                // Updated alt text to be more descriptive, incorporating the project prompt if available.
                alt={`User-uploaded reference image for: ${prompt || 'user project'}`}
                className="mt-2 rounded-md max-h-60 w-auto object-contain border p-1 shadow-sm bg-muted/20"
                width={400} // Or appropriate width
                height={300} // Or appropriate height
                style={{ height: 'auto', maxWidth: '100%' }} // Maintain aspect ratio and responsiveness
              />
            </div>
          )}
          <p className="text-sm text-muted-foreground pt-2">
            ID: {id} <br />
            Generated for user: {userId} on {new Date(createdAt).toLocaleString()}
          </p>
        </div>
      </Section>

      <Separator className="print:hidden" />

      <Section title="Loglines" sectionKey="loglines">
        <div className="space-y-3">
          {loglines.map((logline, index) => (
            <Card key={index} className="bg-muted/30 print:shadow-none print:border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
                 <CardTitle className="text-md font-medium">{logline.tone}</CardTitle>
                 <RegenerateButton sectionName={`Logline ${index + 1}: ${logline.tone}`} onClick={() => onRegenerate?.('logline', { index })} />
              </CardHeader>
              <CardContent className="pb-4">
                <p>{logline.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Separator />

      <Section title="Mood Board" sectionKey="moodBoard">
        {moodBoard.generatedImageURL && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Generated Visual</h3>
              {/* <RegenerateButton sectionName="Mood Board Image" onClick={() => onRegenerate?.('moodBoardImage')} /> */} {/* Regen button removed as image regen is not a separate flow */}
            </div>
            <Image
              src={moodBoard.generatedImageURL!}
              // Updated alt text to be more dynamic, incorporating the project prompt if available.
              alt={`AI-generated mood board for: ${prompt || 'AI generated content'}`}
              className="rounded-lg w-full max-w-2xl mx-auto object-contain border p-1 shadow-sm"
              width={800} // Or appropriate width
              height={600} // Or appropriate height
              style={{ height: 'auto', maxWidth: '100%' }} // Maintain aspect ratio and responsiveness
              // If you know the exact dimensions or ratio, consider layout="responsive" or fixed width/height
              // For responsive images, you might use 'fill' and a parent container with specific aspect ratio
              // Here, using explicit width/height and style to maintain aspect ratio while being responsive up to max-width
            />

          </div>
        )}
        <h3 className="text-lg font-semibold mb-3 mt-4">Thematic Cells</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {moodBoard.cells.map((cell: MoodBoardCell, index: number) => (
            <Card key={index} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{cell.title || `Cell ${index + 1}`}</CardTitle>
                   <RegenerateButton sectionName={`Mood Board Cell ${index + 1}: ${cell.title}`} onClick={() => onRegenerate?.('moodBoardCell', { index })} />
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <CardDescription>{cell.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Separator />

      <Section title="Shot List" sectionKey="shotList">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Shot #</TableHead>
              <TableHead>Lens</TableHead>
              <TableHead>Camera Move</TableHead>
              <TableHead>Framing Notes</TableHead>
              <TableHead className="text-right w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shotList.map((shot, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{shot.shotNumber}</TableCell>
                <TableCell>{shot.lens}</TableCell>
                <TableCell>{shot.cameraMove}</TableCell>
                <TableCell>{shot.framingNotes}</TableCell>
                <TableCell className="text-right">
                    <RegenerateButton sectionName={`Shot ${shot.shotNumber}`} onClick={() => onRegenerate?.('shot', { index })} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Separator />

      <Section title="Animatic Description" sectionKey="animaticDescription">
        <p className="whitespace-pre-wrap text-muted-foreground">{animaticDescription}</p>
      </Section>

      <Separator />

      <Section title="Pitch Summary" sectionKey="pitchSummary">
        <p className="whitespace-pre-wrap text-muted-foreground">{pitchSummary}</p>
      </Section>
    </div>
  );
}
