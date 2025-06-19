import React from 'react';
import { render, screen, waitFor, fireEvent, act, within as rtlWithin } from '@testing-library/react';
import type { TextMatch } from '@testing-library/dom';
import '@testing-library/jest-dom';
import ProductionBoardPage from '../page'; // Adjust path as needed
import { KanbanColumnType } from '@/lib/types';


// Mocking fetch globally
global.fetch = jest.fn();

// Mock IntersectionObserver, often needed for components that lazy load or use scroll effects
class IntersectionObserverMock {
  root: Element | null = null;
  rootMargin: string = '';
  thresholds: ReadonlyArray<number> = [];
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
  takeRecords = jest.fn(() => []); // Return an empty array or mock records

  constructor(
    public callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit
  ) {
    if (options) {
      this.root = options.root || null;
      this.rootMargin = options.rootMargin || '';
      this.thresholds = Array.isArray(options.threshold) ? options.threshold : [options.threshold || 0];
    }
  }
}
global.IntersectionObserver = IntersectionObserverMock as any; // Cast to any if full type matching is hard.


const mockInitialColumnsData: KanbanColumnType[] = [
  {
    id: 'col1', title: 'To Do', cardOrder: ['card1'], // Removed createdAt
    cards: [{ id: 'card1', columnId: 'col1', stage: 'col1', title: 'Task 1: Initial', orderInColumn: 0, description: 'Desc 1' }] // Added stage
  },
  {
    id: 'col2', title: 'In Progress', cardOrder: [], // Removed createdAt
    cards: []
  },
];

describe('ProductionBoardPage', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
    // Default successful fetch for initial load, can be overridden in specific tests
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [...mockInitialColumnsData.map(col => ({...col, cards: [...col.cards]}))], // Deep copy
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially, then columns and cards after successful data load', async () => {
    render(<ProductionBoardPage />);

    expect(screen.getByText(/Loading board.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('To Do')).toBeInTheDocument();
      expect(screen.getByText('Task 1: Initial')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith('/api/production-board/columns', expect.any(Object));
    expect(fetch).toHaveBeenCalledTimes(1); // Initial load
  });

  it('should display an error message if initial data load fails', async () => {
    (fetch as jest.Mock).mockReset(); // Reset to override the default in beforeEach
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('API Network Error'));

    render(<ProductionBoardPage />);

    expect(screen.getByText(/Loading board.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Error: API Network Error/i)).toBeInTheDocument();
    });
     expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
  });

  describe('Add New Task', () => {
    it('should open "Add New Task" dialog, allow form input, submit, and refresh data', async () => {
      render(<ProductionBoardPage />);

      // Wait for initial load to complete
      await waitFor(() => expect(screen.getByText('To Do')).toBeInTheDocument());

      // Find the "Add Task" button in the "To Do" column.
      // This assumes the column title is unique enough or we select more specifically.
      const toDoColumn = screen.getByText('To Do').closest('div[class*="rounded-lg"]') as HTMLElement; // Adjust selector based on actual DOM
      expect(toDoColumn).toBeInTheDocument();

      const addTaskButton = rtlWithin(toDoColumn).getByRole('button', { name: /Add Task/i });
      fireEvent.click(addTaskButton);

      // Dialog should appear
      await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
      expect(screen.getByText(/Add New Task/i)).toBeInTheDocument(); // Dialog title
      expect(screen.getByText(/Column: To Do/i)).toBeInTheDocument();


      // Fill the form
      fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'New Test Task' } });
      fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Test Description' } });

      // Mock the POST request for adding a task
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'cardNew', title: 'New Test Task', columnId: 'col1', orderInColumn: 1 }),
      });
      // Mock the subsequent GET request (fetchBoardData)
      const updatedMockData = [
        { ...mockInitialColumnsData[0], cards: [...mockInitialColumnsData[0].cards, { id: 'cardNew', columnId: 'col1', stage: 'col1', title: 'New Test Task', orderInColumn: 1 }] },
        mockInitialColumnsData[1]
      ];
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedMockData,
      });

      // Submit the form
      fireEvent.click(screen.getByRole('button', { name: /Save Task/i }));

      // Dialog should close, and data should be re-fetched
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

      // Verify the new task is displayed
      await waitFor(() => {
        expect(screen.getByText('New Test Task')).toBeInTheDocument();
      });

      // Check API calls
      // 1st call was initial load. 2nd is POST. 3rd is re-fetch.
      expect(fetch).toHaveBeenCalledTimes(3);
      expect(fetch).toHaveBeenCalledWith(
        '/api/production-board/columns/col1/cards', // Assumes col1 is the ID for "To Do"
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            title: 'New Test Task',
            description: 'Test Description',
            priority: '', // Default from form state
            dueDate: '',   // Default from form state
            orderInColumn: mockInitialColumnsData[0].cards.length // Initial length before adding
          }),
        })
      );
      expect(fetch).toHaveBeenLastCalledWith('/api/production-board/columns', expect.any(Object)); // Re-fetch
    });
  });

  describe('Add New Stage', () => {
    it('should open "Add New Stage" dialog, allow form input, submit, and refresh data', async () => {
      render(<ProductionBoardPage />);

      // Wait for initial load
      await waitFor(() => expect(screen.getByText('To Do')).toBeInTheDocument());

      // Click "Add New Stage" button
      const addStageButton = screen.getByRole('button', { name: /Add New Stage/i });
      fireEvent.click(addStageButton);

      // Dialog should appear
      await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
      expect(screen.getByText(/Add New Stage/i, { selector: 'h2' })).toBeInTheDocument(); // Dialog title

      // Fill the form
      fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'New Stage Title' } });

      // Mock the POST request for adding a stage
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'colNew', title: 'New Stage Title', cardOrder: [], cards: [] }),
      });
      // Mock the subsequent GET request (fetchBoardData)
      const updatedMockDataWithNewStage = [
        ...mockInitialColumnsData.map(col => ({...col, cards: [...col.cards.map(c => ({...c}))]})), // Deep copy existing, ensure cards are also deep copied
        { id: 'colNew', title: 'New Stage Title', cardOrder: [], cards: [] }
      ];
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedMockDataWithNewStage,
      });

      // Submit the form
      fireEvent.click(screen.getByRole('button', { name: /Save Stage/i }));

      // Dialog should close
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

      // Verify the new stage is displayed
      await waitFor(() => {
        expect(screen.getByText('New Stage Title')).toBeInTheDocument();
      });

      // Check API calls
      // 1st call initial load. 2nd is POST for new stage. 3rd is re-fetch.
      expect(fetch).toHaveBeenCalledTimes(3);
      expect(fetch).toHaveBeenCalledWith(
        '/api/production-board/columns',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ title: 'New Stage Title' }),
        })
      );
      expect(fetch).toHaveBeenLastCalledWith('/api/production-board/columns', expect.any(Object)); // Re-fetch
    });
  });

  describe('Card Drag-and-Drop (Move)', () => {
    it('should call the move API and refresh data when a card is dropped on a different column', async () => {
      render(<ProductionBoardPage />);

      // Wait for initial load
      await waitFor(() => expect(screen.getByText('To Do')).toBeInTheDocument());
      await waitFor(() => expect(screen.getByText('Task 1: Initial')).toBeInTheDocument());

      const cardToMove = screen.getByText('Task 1: Initial'); // Belongs to col1 ('To Do')
      const targetColumnElement = screen.getByText('In Progress').closest('div[class*="rounded-lg"]'); // col2
      expect(targetColumnElement).toBeInTheDocument();

      // Mock the PATCH request for moving the card
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'card1', title: 'Task 1: Initial', columnId: 'col2', orderInColumn: 0 }), // Response from PATCH
      });

      // Mock the subsequent GET request (fetchBoardData)
      const movedMockData = [
        { ...mockInitialColumnsData[0], cardOrder: [], cards: [] }, // Task 1 moved from here
        { ...mockInitialColumnsData[1], cardOrder: ['card1'], cards: [{ id: 'card1', columnId: 'col2', stage: 'col2', title: 'Task 1: Initial', orderInColumn: 0 }] } // Task 1 moved here, added stage
      ];
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => movedMockData,
      });

      // Simulate the drop event
      // This is a simplified simulation. A real drag and drop involves multiple events.
      // We need to ensure dataTransfer.getData is available.
      const dataTransfer = {
        getData: jest.fn((format) => {
          if (format === 'cardId') return 'card1';
          if (format === 'sourceColumnId') return 'col1';
          return '';
        }),
        setData: jest.fn(), // dragStart would use this
        effectAllowed: '',
        dropEffect: ''
      };

      // Act is used because state updates will happen
      await act(async () => {
        fireEvent.dragStart(cardToMove, { dataTransfer });
        fireEvent.drop(targetColumnElement!, { dataTransfer });
      });

      // Verify API calls
      // 1st initial, 2nd PATCH, 3rd re-fetch
      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));

      expect(fetch).toHaveBeenCalledWith(
        '/api/production-board/cards/card1/move',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            targetColumnId: 'col2',
            newOrderInColumn: 0, // Dropped in an empty column, so index is 0
          }),
        })
      );
      expect(fetch).toHaveBeenLastCalledWith('/api/production-board/columns', expect.any(Object)); // Re-fetch

      // Verify UI update (Task 1 should now be under "In Progress")
      // This requires the column component to correctly find its cards for display
      const inProgressCol = screen.getByText('In Progress').closest('div[class*="rounded-lg"]') as HTMLElement;
      expect(rtlWithin(inProgressCol).getByText('Task 1: Initial')).toBeInTheDocument();

      const toDoCol = screen.getByText('To Do').closest('div[class*="rounded-lg"]') as HTMLElement;
      expect(rtlWithin(toDoCol).queryByText('Task 1: Initial')).not.toBeInTheDocument();
    });
  });
});
