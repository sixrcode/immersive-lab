'use client';

import Image from 'next/image';
import React, { FC, useState } from 'react'; // Added useState
import type { PromptPackage, MoodBoardCell } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'; // Aliased
import { Separator } from '@/components/ui/separator'; // Aliased
import { Flag } from 'lucide-react'; // Added Flag icon

import { useToast } from '@/components/ui/use-toast';
import {
  FeedbackDialog,
  FeedbackDialogFormData,
} from '@/components/feedback/FeedbackDialog';
import {
  useSubmitFeedback,
  SubmitFeedbackHookInput,
} from '@/hooks/useSubmitFeedback';

// Placeholder for a Refresh Icon.
const RefreshIcon = () => (
  // Using a simple text or a unicode character for now if SVG is too verbose for diff
  (<span className="mr-2">↻</span>)
);

// Placeholder for Download Icon
const ReportIcon = () => <Flag className="h-4 w-4" />; // Added ReportIcon using Flag

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

// Report Button Component
const ReportButton = ({ onClick, itemName }: { onClick: () => void; itemName: string }) => (
  <Button
    variant="ghost"
    size="icon"
    onClick={onClick}
    className="ml-2 print:hidden"
    title={`Report ${itemName}`}
    aria-label={`Report ${itemName}`}
  >
    <ReportIcon />
  </Button>
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
  // | "moodBoardImage" // Removed as it was commented out
  | "moodBoard"
  | "shotList"
  | "animaticDescription"
  | "pitchSummary"
  | "logline"
  | "moodBoardCell"
  | "shot";

interface PrototypeDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  promptPackage: PromptPackage | null | undefined;
  onRegenerate?: (section: SectionKey, data?: OnRegenerateData) => void;
}

interface ReportData {
  path: string;
  prototypeId: string;
}

export function PrototypeDisplay({ promptPackage, onRegenerate }: PrototypeDisplayProps) {
  const { toast } = useToast();
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [currentReportData, setCurrentReportData] = useState<ReportData | null>(null);

  const { mutate: submitFeedbackMutate, isPending: isSubmittingFeedback } = useSubmitFeedback();

  const openFeedbackDialog = (path: string, prototypeId: string) => {
    setCurrentReportData({ path, prototypeId });
    setIsFeedbackDialogOpen(true);
  };

  const handleFeedbackSubmit = (data: FeedbackDialogFormData) => {
    const submissionData: SubmitFeedbackHookInput = {
      prototypeId: data.prototypeId,
      reportedContentPath: data.reportedContentPath,
      reason: data.reason,
      category: data.category,
    };
    submitFeedbackMutate(submissionData, {
      onSuccess: () => {
        toast({
          title: 'Feedback Submitted',
          description: 'Thank you for your feedback!',
        });
        setIsFeedbackDialogOpen(false);
        setCurrentReportData(null);
      },
      onError: (error) => {
        toast({
          title: 'Error Submitting Feedback',
          description: error.message || 'An unexpected error occurred.',
          variant: 'destructive',
        });
      },
    });
  };


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

  const Section: FC<{ title: string; children: React.ReactNode; sectionKey: SectionKey; actions?: React.ReactNode, mainActionOverride?: React.ReactNode }> =
    ({ title, children, sectionKey, actions, mainActionOverride }) => (
    <Card className="mb-6 print:shadow-none print:border-0">
      <CardHeader className="flex flex-row items-center">
        <CardTitle className="text-xl">{title}</CardTitle>
        {actions}
        {mainActionOverride ? mainActionOverride : (sectionKey !== "mainHeader" && onRegenerate && <RegenerateButton sectionName={title} onClick={() => onRegenerate?.(sectionKey)} />)}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );

  return (
    <div className="space-y-8 mt-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-2 border-b">
        <h2 className="text-2xl font-semibold">Generated Prototype</h2>
        <div className="flex items-center space-x-2">
          {/* Added aria-label for enhanced clarity for assistive technologies. */}
          <Button onClick={handleDownloadJson} variant="default" size="sm" className="mt-2 sm:mt-0 print:hidden" data-testid="download-json-button" aria-label="Download prototype data as JSON file">
            <DownloadIcon />
            Download JSON
          </Button>
        </div>
      </div>

      <Section title="Original Input" sectionKey="userInput" mainActionOverride={<div /> /* No regenerate for this section */}>
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

      <Section title="Loglines" sectionKey="loglines" mainActionOverride={onRegenerate ? <RegenerateButton sectionName="All Loglines" onClick={() => onRegenerate?.('loglines')} /> : <div />}>
        <div className="space-y-3">
          {loglines.map((logline, index) => (
            <Card key={index} className="bg-muted/30 print:shadow-none print:border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
                 <CardTitle className="text-md font-medium">{logline.tone}</CardTitle>
                 <div className="flex items-center">
                   {onRegenerate && <RegenerateButton sectionName={`Logline ${index + 1}: ${logline.tone}`} onClick={() => onRegenerate?.('logline', { index })} />}
                   <ReportButton itemName={`Logline ${index + 1}`} onClick={() => openFeedbackDialog(`loglines[${index}].text`, id)} />
                 </div>
              </CardHeader>
              <CardContent className="pb-4">
                <p>{logline.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Separator />

      <Section title="Mood Board" sectionKey="moodBoard" mainActionOverride={onRegenerate ? <RegenerateButton sectionName="Entire Mood Board" onClick={() => onRegenerate?.('moodBoard')} /> : <div />}>
        {moodBoard.generatedImageURL && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Generated Visual</h3>
              {/* No individual report for the main image, report on cells or overall section if needed */}
            </div>
            <Image
              src={moodBoard.generatedImageURL}
              // Updated alt text to be more dynamic, incorporating the project prompt if available.
              alt={`AI-generated mood board for: ${prompt || 'AI generated content'}`}
              className="rounded-lg w-full max-w-2xl mx-auto object-contain border p-1 shadow-sm"
              width={800}
              height={600}
              style={{ height: 'auto', maxWidth: '100%' }}
            />
            {/* Reporting for the main image could be added here if desired */}
            {/* <ReportButton itemName="Mood Board Image" onClick={() => openFeedbackDialog(`moodBoard.generatedImageURL`, id)} /> */}
          </div>
        )}
        <h3 className="text-lg font-semibold mb-3 mt-4">Thematic Cells</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {moodBoard.cells.map((cell: MoodBoardCell, index: number) => (
            <Card key={index} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{cell.title || `Cell ${index + 1}`}</CardTitle>
                  <div className="flex items-center">
                    {onRegenerate && <RegenerateButton sectionName={`Mood Board Cell ${index + 1}: ${cell.title}`} onClick={() => onRegenerate?.('moodBoardCell', { index })} />}
                    <ReportButton itemName={`Mood Board Cell ${index + 1}`} onClick={() => openFeedbackDialog(`moodBoard.cells[${index}].description`, id)} />
                  </div>
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

      <Section title="Shot List" sectionKey="shotList" mainActionOverride={onRegenerate ? <RegenerateButton sectionName="Entire Shot List" onClick={() => onRegenerate?.('shotList')} />: <div />}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Shot #</TableHead>
              <TableHead>Lens</TableHead>
              <TableHead>Camera Move</TableHead>
              <TableHead>Framing Notes</TableHead>
              <TableHead className="text-right w-[200px]">Actions</TableHead>
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
                  <div className="flex items-center justify-end">
                    {onRegenerate && <RegenerateButton sectionName={`Shot ${shot.shotNumber}`} onClick={() => onRegenerate?.('shot', { index })} />}
                    <ReportButton itemName={`Shot ${shot.shotNumber}`} onClick={() => openFeedbackDialog(`shotList[${index}].framingNotes`, id)} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Separator />

      <Section title="Animatic Description" sectionKey="animaticDescription">
        <div className="flex items-start justify-between">
          <p className="whitespace-pre-wrap text-muted-foreground flex-grow">{animaticDescription}</p>
          <ReportButton itemName="Animatic Description" onClick={() => openFeedbackDialog('animaticDescription', id)} />
        </div>
      </Section>

      <Separator />

      <Section title="Pitch Summary" sectionKey="pitchSummary">
         <div className="flex items-start justify-between">
          <p className="whitespace-pre-wrap text-muted-foreground flex-grow">{pitchSummary}</p>
          <ReportButton itemName="Pitch Summary" onClick={() => openFeedbackDialog('pitchSummary', id)} />
        </div>
      </Section>

      {currentReportData && (
        <FeedbackDialog
          isOpen={isFeedbackDialogOpen}
          onOpenChange={setIsFeedbackDialogOpen}
          onSubmit={handleFeedbackSubmit}
          reportedContentPath={currentReportData.path}
          prototypeId={currentReportData.prototypeId}
          isLoading={isSubmittingFeedback}
        />
      )}
    </div>
  );
}
