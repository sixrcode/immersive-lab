import type { PromptPackage } from '../prompt-package';
import type { Logline, MoodBoard, MoodBoardCell, Shot, PortfolioItemType, KanbanCardType } from '../../types'; // Assuming types.ts is in src/lib

describe('Type Definitions', () => {
  it('PromptPackage should be defined (compiles)', () => {
    // This test primarily checks if the types can be resolved and compiled.
    // We can optionally create a dummy object that conforms to the type.
    const dummyPackage: PromptPackage = {
      id: 'test-id',
      userId: 'user-test-id',
      prompt: 'A test prompt',
      stylePreset: 'cinematic',
      originalImageURL: 'http://example.com/image.jpg',
      createdAt: new Date(),
      updatedAt: new Date(),
      loglines: [{ tone: 'Dramatic', text: 'A logline.' }],
      moodBoard: {
        generatedImageURL: 'http://example.com/moodboard.jpg',
        cells: [{ title: 'Cell 1', description: 'Desc 1' }],
      },
      shotList: [{ shotNumber: 1, lens: '35mm', cameraMove: 'Pan', framingNotes: 'Close up' }],
      animaticDescription: 'An animatic description.',
      pitchSummary: 'A pitch summary.',
      version: 1,
      collaboratorIds: ['collab1'],
    };
    expect(dummyPackage.id).toBe('test-id');
    expect(dummyPackage.loglines[0].tone).toBe('Dramatic');
  });

  it('Other shared types should be defined (compiles)', () => {
    const dummyLogline: Logline = { tone: 'Comedy', text: 'Funny line.' };
    const dummyMoodBoardCell: MoodBoardCell = { title: 'Colors', description: 'Blue and yellow' };
    const dummyMoodBoard: MoodBoard = {
      generatedImageURL: 'http://example.com/mood.png',
      cells: [dummyMoodBoardCell],
    };
    const dummyShot: Shot = { shotNumber: 2, lens: '50mm', cameraMove: 'Tilt', framingNotes: 'Wide shot' };

    expect(dummyLogline.tone).toBe('Comedy');
    expect(dummyMoodBoardCell.title).toBe('Colors');
    expect(dummyMoodBoard.cells.length).toBe(1);
    expect(dummyShot.shotNumber).toBe(2);

    // For types not directly part of PromptPackage but in types.ts
    const dummyPortfolioItem: PortfolioItemType = {
      id: 'p1',
      title: 'Item',
      description: 'Desc',
      imageUrl: 'url',
      category: 'Film',
    };
    expect(dummyPortfolioItem.category).toBe('Film');

    const dummyKanbanCard: KanbanCardType = {
        id: 'k1',
        title: 'Task',
        stage: 'todo',
    };
    expect(dummyKanbanCard.stage).toBe('todo');

  });
});
