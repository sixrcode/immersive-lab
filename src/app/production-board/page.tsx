
"use client";

import type { KanbanCardType, KanbanColumnType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { PlusCircle, MoreHorizontal, Kanban as KanbanIcon, Film, Lightbulb, Edit2, CheckCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import React, { useState, useEffect, FormEvent } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


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
  onDropCard: (targetColumnId: string, cardId: string, sourceColumnId: string, newOrderInColumn: number) => void;
  onOpenAddTaskDialog: (columnId: string) => void;
  colorClasses: { header: string; body: string; iconText: string };
}

function KanbanColumnComponent({ column, onDropCard, onOpenAddTaskDialog, colorClasses }: KanbanColumnComponentProps) {
  const IconComponent = columnIcons[column.id] || KanbanIcon;

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData("cardId");
    const sourceColumnId = e.dataTransfer.getData("sourceColumnId");

    // Calculate the index where the card is being dropped
    let newOrderInColumn = column.cards.length; // Default to end of list

    // Attempt to find the card element being dropped ON, to insert before or after it
    const dropTargetElement = e.target as HTMLElement;
    const cardElement = dropTargetElement.closest('[id^="card-"]');

    if (cardElement) {
      const droppedOnCardId = cardElement.id.replace('card-', '');
      const cardIndex = column.cards.findIndex(c => c.id === droppedOnCardId);

      if (cardIndex !== -1) {
        const rect = cardElement.getBoundingClientRect();
        // If dropping in the top half of the card, insert before it, otherwise after.
        const isDropInUpperHalf = e.clientY < rect.top + rect.height / 2;
        newOrderInColumn = isDropInUpperHalf ? cardIndex : cardIndex + 1;
      }
    } else {
      // If not dropping on a card (e.g., empty column or below all cards),
      // newOrderInColumn remains column.cards.length (append).
      // A class on the direct scrollable content area can help refine this.
      // For instance, if e.target is that area itself.
      const columnContentArea = dropTargetElement.closest('.kanban-column-content-area');
      if (columnContentArea && column.cards.length === 0) {
          newOrderInColumn = 0;
      }
    }

    // Prevent calling onDropCard if cardId or sourceColumnId is missing
    if (!cardId || !sourceColumnId) {
        console.warn("Missing cardId or sourceColumnId on drop");
        return;
    }

    // If it's the same column, and the card isn't actually moving position, do nothing.
    // This check is simplified; a more robust check would compare old index vs new index.
    if (sourceColumnId === column.id) {
        const oldIndex = column.cards.findIndex(c => c.id === cardId);
        // If dropping in the same spot (or just after itself, which becomes same spot after removal)
        if (oldIndex === newOrderInColumn || oldIndex + 1 === newOrderInColumn) {
             // This logic can be tricky if just checking oldIndex against newOrderInColumn
             // when card is removed first. For now, allow re-drop in same column to trigger API.
        }
    }

    onDropCard(column.id, cardId, sourceColumnId, newOrderInColumn);
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
      <ScrollArea className="flex-1 p-2 kanban-column-content-area"> {/* Added class for drop detection */}
        {column.cards && column.cards.length > 0 ? (
          column.cards.map((card) => <KanbanCardComponent key={card.id} card={card} columnId={column.id} />)
        ) : (
          <div className="text-center text-sm text-muted-foreground py-4 min-h-[50px] pointer-events-none">Drop cards here or add tasks.</div>
        )}
      </ScrollArea>
       <Button variant="ghost" className="mt-2 text-sm text-muted-foreground hover:text-foreground" onClick={() => onOpenAddTaskDialog(column.id)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Task
        </Button>
    </div>
  );
}


export default function ProductionBoardPage() {
  const [columns, setColumns] = useState<KanbanColumnType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState<boolean>(false);
  const [selectedColumnIdForNewTask, setSelectedColumnIdForNewTask] = useState<string | null>(null);
  const [newTaskForm, setNewTaskForm] = useState({ title: '', description: '', priority: '', dueDate: '' });
  const [addTaskError, setAddTaskError] = useState<string | null>(null);

  const [isAddStageDialogOpen, setIsAddStageDialogOpen] = useState<boolean>(false);
  const [newStageTitle, setNewStageTitle] = useState<string>('');
  const [addStageError, setAddStageError] = useState<string | null>(null);

  const handleOpenAddTaskDialog = (columnId: string) => {
    setSelectedColumnIdForNewTask(columnId);
    setNewTaskForm({ title: '', description: '', priority: '', dueDate: '' }); // Reset form
    setAddTaskError(null); // Clear previous errors
    setIsAddTaskDialogOpen(true);
  };

  const handleAddTaskSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedColumnIdForNewTask || !newTaskForm.title.trim()) {
      setAddTaskError("Title is required.");
      return;
    }
    setAddTaskError(null); // Clear error

    const targetColumn = columns.find(col => col.id === selectedColumnIdForNewTask);
    const orderInColumn = targetColumn && targetColumn.cards ? targetColumn.cards.length : 0;

    try {
      const response = await fetch(`/api/production-board/columns/${selectedColumnIdForNewTask}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', /* TODO: Auth */ },
        body: JSON.stringify({ ...newTaskForm, orderInColumn }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({error: "Failed to create task"}));
        throw new Error(errData.error || "Server error");
      }
      setIsAddTaskDialogOpen(false);
      fetchBoardData(); // Refresh data
    } catch (err: any) {
      setAddTaskError(err.message);
    }
  };

  const handleOpenAddStageDialog = () => {
    setNewStageTitle('');
    setAddStageError(null);
    setIsAddStageDialogOpen(true);
  };

  const handleAddStageSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newStageTitle.trim()) {
      setAddStageError("Title is required.");
      return;
    }
    setAddStageError(null);

    try {
      const response = await fetch(`/api/production-board/columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', /* TODO: Auth */ },
        body: JSON.stringify({ title: newStageTitle.trim() }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({error: "Failed to create stage"}));
        throw new Error(errData.error || "Server error");
      }
      setIsAddStageDialogOpen(false);
      fetchBoardData(); // Refresh data
    } catch (err: any) {
      setAddStageError(err.message);
    }
  };

  const fetchBoardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // The /api/ path implies it might be hitting a Next.js API route that proxies to Firebase,
      // or Firebase hosting rewrites.
      // Authentication headers would be needed if the API is protected.
      const response = await fetch('/api/production-board/columns', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Example: 'Authorization': `Bearer ${idToken}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
        throw new Error(errorData.error || `Failed to fetch board data: ${response.statusText}`);
      }
      const data: KanbanColumnType[] = await response.json();
      setColumns(data);
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError(err.message || "An unknown error occurred while fetching data.");
      setColumns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoardData();
  }, []);

  const handleDropCard = (targetColumnId: string, cardId: string, sourceColumnId: string, newOrderInColumn: number) => {
    // Store previous columns for potential rollback
    const previousColumns = JSON.parse(JSON.stringify(columns)); // Deep copy

    // Optimistic update
    setColumns(prevColumns => {
      const cardToMove: KanbanCardType | undefined;
      const newColumns = [...prevColumns]; // Create a mutable copy
 
      // Find and remove card from source column
      const sourceColIndex = newColumns.findIndex(col => col.id === sourceColumnId);
      if (sourceColIndex === -1) return prevColumns; // Source column not found

      const sourceCol = { ...newColumns[sourceColIndex] }; // Copy source column
      sourceCol.cards = [...(sourceCol.cards || [])]; // Copy cards array
      
      const cardIndexInSource = sourceCol.cards.findIndex(c => c.id === cardId);
      if (cardIndexInSource === -1) return prevColumns; // Card not found in source

      [cardToMove] = sourceCol.cards.splice(cardIndexInSource, 1);
      newColumns[sourceColIndex] = sourceCol;

      if (!cardToMove) return prevColumns;

      // Add card to target column at newOrderInColumn
      const targetColIndex = newColumns.findIndex(col => col.id === targetColumnId);
      if (targetColIndex === -1) return prevColumns; // Target column not found

      const targetCol = { ...newColumns[targetColIndex] }; // Copy target column
      targetCol.cards = [...(targetCol.cards || [])]; // Copy cards array

      // Update card's stage (columnId) and orderInColumn for optimistic update
      cardToMove.stage = targetColumnId;
      cardToMove.columnId = targetColumnId; // Ensure columnId is also updated
      cardToMove.orderInColumn = newOrderInColumn;

      targetCol.cards.splice(newOrderInColumn, 0, cardToMove);
      newColumns[targetColIndex] = targetCol;

      return newColumns;
    });

    // API Call
    (async () => {
      try {
        // TODO: Get token for Authorization header
        const response = await fetch(`/api/production-board/cards/${cardId}/move`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            // 'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            targetColumnId,
            newOrderInColumn,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
          throw new Error(errorData.error || `API Error: ${response.statusText}`);
        }

        // On success, re-fetch data to ensure consistency
        // Alternatively, update state with response if API returns the full board or updated columns/card
        fetchBoardData();
        // You might want to show a success toast here
      } catch (err: any) {
        console.error("Failed to move card:", err);
        setError(`Failed to move card: ${err.message}. Reverting.`);
        // Rollback optimistic update
        setColumns(previousColumns);
        // You might want to show an error toast here
      }
    })();
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg text-muted-foreground">Loading board...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-destructive">
        <p className="text-lg mb-4">Error: {error}</p>
        <Button onClick={fetchBoardData} variant="outline">Try Again</Button>
      </div>
    );
  }

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
              onOpenAddTaskDialog={handleOpenAddTaskDialog}
              colorClasses={stageColorClasses[column.id] || { header: 'bg-muted/60 dark:bg-muted/30', body: 'bg-muted/30 dark:bg-muted/20', iconText: 'text-primary' }}
            />
          ))}
           <div className="w-80 min-w-[320px] flex items-center justify-center p-1">
            <Button variant="outline" className="w-full h-16 border-dashed bg-muted/20 hover:bg-muted/40" onClick={handleOpenAddStageDialog}>
              <PlusCircle className="mr-2 h-5 w-5" /> Add New Stage
            </Button>
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Add Task Dialog */}
      <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
            <DialogDescription>
              Fill in the details for your new task. Column: {columns.find(c => c.id === selectedColumnIdForNewTask)?.title || ''}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddTaskSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="task-title" className="text-right">Title</Label>
                <Input
                  id="task-title"
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm({...newTaskForm, title: e.target.value})}
                  className="col-span-3"
                  placeholder="Enter task title"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="task-description" className="text-right">Description</Label>
                <Textarea
                  id="task-description"
                  value={newTaskForm.description}
                  onChange={(e) => setNewTaskForm({...newTaskForm, description: e.target.value})}
                  className="col-span-3"
                  placeholder="Enter task description (optional)"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="task-priority" className="text-right">Priority</Label>
                <Select
                  value={newTaskForm.priority}
                  onValueChange={(value) => setNewTaskForm({...newTaskForm, priority: value})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select priority (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="task-dueDate" className="text-right">Due Date</Label>
                <Input
                  id="task-dueDate"
                  type="date"
                  value={newTaskForm.dueDate}
                  onChange={(e) => setNewTaskForm({...newTaskForm, dueDate: e.target.value})}
                  className="col-span-3"
                />
              </div>
              {addTaskError && <p className="col-span-4 text-destructive text-sm text-center">{addTaskError}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddTaskDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Save Task</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Stage Dialog */}
      <Dialog open={isAddStageDialogOpen} onOpenChange={setIsAddStageDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Stage</DialogTitle>
            <DialogDescription>
              Enter the title for the new production stage.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddStageSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="stage-title" className="text-right">Title</Label>
                <Input
                  id="stage-title"
                  value={newStageTitle}
                  onChange={(e) => setNewStageTitle(e.target.value)}
                  className="col-span-3"
                  placeholder="Enter stage title"
                />
              </div>
              {addStageError && <p className="col-span-4 text-destructive text-sm text-center">{addStageError}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddStageDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Save Stage</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

