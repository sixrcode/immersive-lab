
"use client";

import type { KanbanCardType, KanbanColumnType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { PlusCircle, MoreHorizontal, Kanban as KanbanIcon, Film, Lightbulb, Edit2, CheckCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import React, { useState } from "react";
import { cn } from "@/lib/utils";

const initialColumnsData: KanbanColumnType[] = [
  {
    id: "pitch",
    title: "Pitch & Concept",
    cards: [
      { id: "p1", title: "Sci-Fi Short: Mars Anomaly", description: "Logline and mood board for a discovery on Mars.", stage: "pitch", priority: 'high', dueDate: '2024-08-15', coverImage: 'https://placehold.co/300x200.png', dataAiHint: 'sci-fi mars' },
      { id: "p2", title: "Animated Series: Forest Spirits", description: "Concept art and pilot outline.", stage: "pitch", priority: 'medium', coverImage: 'https://placehold.co/300x200.png', dataAiHint: 'animated forest' },
    ],
  },
  {
    id: "storyboard",
    title: "Storyboard",
    cards: [
      { id: "s1", title: "Mars Anomaly - Scene 1", description: "Opening sequence storyboard.", stage: "storyboard", priority: 'high', coverImage: 'https://placehold.co/300x200.png', dataAiHint: 'storyboard space' },
    ],
  },
  {
    id: "scriptwriting",
    title: "Scriptwriting",
    cards: [
      { id: "sw1", title: "Forest Spirits - Episode 1 Draft", description: "First draft of the pilot script.", stage: "scriptwriting", priority: 'medium', dueDate: '2024-09-01', coverImage: 'https://placehold.co/300x200.png', dataAiHint: 'script writing' },
    ],
  },
  {
    id: "rough-cut",
    title: "Rough Cut / Assembly",
    cards: [],
  },
  {
    id: "final-polish",
    title: "Final Polish & VFX",
    cards: [],
  },
  {
    id: "distribution",
    title: "Distribution & Premiere",
    cards: [
       { id: "d1", title: "Completed: The Urban Garden", description: "Short documentary, submitted to festivals.", stage: "distribution", priority: 'low', coverImage: 'https://placehold.co/300x200.png', dataAiHint: 'documentary film' },
    ],
  },
];

// Map column IDs to icons
const columnIcons: Record<string, React.ElementType> = {
  pitch: Lightbulb,
  storyboard: Edit2,
  scriptwriting: Film,
  "rough-cut": KanbanIcon, 
  "final-polish": CheckCircle,
  distribution: Send,
};

const stageColorClasses: Record<string, { header: string; body: string; iconText: string }> = {
  pitch: { header: 'bg-sky-200 dark:bg-sky-700/80', body: 'bg-sky-100 dark:bg-sky-900/50', iconText: 'text-sky-700 dark:text-sky-300' },
  storyboard: { header: 'bg-teal-200 dark:bg-teal-700/80', body: 'bg-teal-100 dark:bg-teal-900/50', iconText: 'text-teal-700 dark:text-teal-300' },
  scriptwriting: { header: 'bg-indigo-200 dark:bg-indigo-700/80', body: 'bg-indigo-100 dark:bg-indigo-900/50', iconText: 'text-indigo-700 dark:text-indigo-300' },
  'rough-cut': { header: 'bg-amber-200 dark:bg-amber-700/80', body: 'bg-amber-100 dark:bg-amber-900/50', iconText: 'text-amber-700 dark:text-amber-300' },
  'final-polish': { header: 'bg-lime-200 dark:bg-lime-700/80', body: 'bg-lime-100 dark:bg-lime-900/50', iconText: 'text-lime-700 dark:text-lime-300' },
  distribution: { header: 'bg-rose-200 dark:bg-rose-700/80', body: 'bg-rose-100 dark:bg-rose-900/50', iconText: 'text-rose-700 dark:text-rose-300' },
};


function KanbanCardComponent({ card, columnId }: { card: KanbanCardType; columnId: string }) {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("cardId", card.id);
    e.dataTransfer.setData("sourceColumnId", columnId);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <Card 
      className="mb-3 shadow-md hover:shadow-lg transition-shadow duration-200 bg-card cursor-grab"
      draggable
      onDragStart={handleDragStart}
      id={`card-${card.id}`}
    >
      {card.coverImage && (
        <div className="relative h-32 w-full">
          <Image 
            src={card.coverImage} 
            alt={card.title} 
            fill
            className="rounded-t-lg object-cover"
            data-ai-hint={card.dataAiHint || 'project image'}
            sizes="320px"
           />
        </div>
      )}
      <CardHeader className="p-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-sm font-semibold">{card.title}</CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
        {card.description && <CardDescription className="text-xs mt-1 line-clamp-2">{card.description}</CardDescription>}
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {card.priority && <Badge variant={card.priority === 'high' ? 'destructive' : card.priority === 'medium' ? 'secondary' : 'outline'} className="text-xs">{card.priority}</Badge>}
        {card.dueDate && <p className="text-xs text-muted-foreground mt-1">Due: {card.dueDate}</p>}
      </CardContent>
    </Card>
  );
}

interface KanbanColumnComponentProps {
  column: KanbanColumnType;
  onDropCard: (targetColumnId: string, cardId: string, sourceColumnId: string) => void;
  colorClasses: { header: string; body: string; iconText: string };
}

function KanbanColumnComponent({ column, onDropCard, colorClasses }: KanbanColumnComponentProps) {
  const IconComponent = columnIcons[column.id] || KanbanIcon;

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData("cardId");
    const sourceColumnId = e.dataTransfer.getData("sourceColumnId");
    if (cardId && sourceColumnId && sourceColumnId !== column.id) {
      onDropCard(column.id, cardId, sourceColumnId);
    }
  };

  return (
    <div 
      className={cn("flex flex-col w-80 min-w-[320px] rounded-lg p-1 shadow-sm", colorClasses.body)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className={cn(
        "flex justify-between items-center p-3 mb-2 sticky top-0 z-10 rounded-t-lg shadow-sm",
        colorClasses.header
      )}>
        <div className="flex items-center gap-2">
          <IconComponent className={cn("h-5 w-5", colorClasses.iconText)} />
          <h3 className="font-semibold text-md text-foreground">{column.title}</h3>
        </div>
        <Badge variant="secondary" className="bg-background/50 text-foreground">{column.cards.length}</Badge>
      </div>
      <ScrollArea className="flex-1 p-2">
        {column.cards.length > 0 ? (
          column.cards.map((card) => <KanbanCardComponent key={card.id} card={card} columnId={column.id} />)
        ) : (
          <div className="text-center text-sm text-muted-foreground py-4 min-h-[50px]">Drop cards here or add tasks.</div>
        )}
      </ScrollArea>
       <Button variant="ghost" className="mt-2 text-sm text-muted-foreground hover:text-foreground">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Task
        </Button>
    </div>
  );
}


export default function ProductionBoardPage() {
  const [columns, setColumns] = useState<KanbanColumnType[]>(initialColumnsData);

  const handleDropCard = (targetColumnId: string, cardId: string, sourceColumnId: string) => {
    setColumns(prevColumns => {
      let cardToMove: KanbanCardType | undefined;
      
      const newColumns = prevColumns.map(col => {
        if (col.id === sourceColumnId) {
          cardToMove = col.cards.find(c => c.id === cardId);
          return { ...col, cards: col.cards.filter(c => c.id !== cardId) };
        }
        return col;
      });

      if (!cardToMove) return prevColumns; 

      return newColumns.map(col => {
        if (col.id === targetColumnId) {
          const updatedCard = { ...cardToMove!, stage: targetColumnId };
          return { ...col, cards: [...col.cards, updatedCard] };
        }
        return col;
      });
    });
  };
  

  return (
    <div className="flex flex-col h-full">
      <header className="py-6 px-1">
        <div className="flex items-center gap-2">
          <KanbanIcon className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Production Board</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          Visualize and manage your creative projects through each stage of production. Drag cards to move them between stages.
        </p>
      </header>
      <ScrollArea className="flex-1 w-full pb-4">
        <div className="flex gap-4 p-1">
          {columns.map((column) => (
            <KanbanColumnComponent 
              key={column.id} 
              column={column} 
              onDropCard={handleDropCard}
              colorClasses={stageColorClasses[column.id] || { header: 'bg-muted/60 dark:bg-muted/30', body: 'bg-muted/30 dark:bg-muted/20', iconText: 'text-primary' }}
            />
          ))}
           <div className="w-80 min-w-[320px] flex items-center justify-center p-1">
            <Button variant="outline" className="w-full h-16 border-dashed bg-muted/20 hover:bg-muted/40">
              <PlusCircle className="mr-2 h-5 w-5" /> Add New Stage
            </Button>
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

