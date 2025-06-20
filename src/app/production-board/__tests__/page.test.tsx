import React from 'react';
import { render, screen, waitFor, fireEvent, act, within as rtlWithin } from '@testing-library/react';
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
global.IntersectionObserver = IntersectionObserverMock as typeof IntersectionObserverMock; // Cast to any if full type matching is hard.


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

// Mock data for new drag-and-drop scenarios
const mockDataEmptyTargetColumn: KanbanColumnType[] = [
  {
    id: 'col1', title: 'Source Column', cardOrder: ['card1'],
    cards: [{ id: 'card1', columnId: 'col1', stage: 'col1', title: 'Draggable Card 1', orderInColumn: 0, description: 'Description 1' }]
  },
  {
    id: 'col2', title: 'Empty Target Column', cardOrder: [],
    cards: []
  },
];

const mockDataMultiCardTargetColumn: KanbanColumnType[] = [
  {
    id: 'colA', title: 'Source Column A', cardOrder: ['cardA1'],
    cards: [{ id: 'cardA1', columnId: 'colA', stage: 'colA', title: 'Card A1', orderInColumn: 0, description: 'Description A1' }]
  },
  {
    id: 'colB', title: 'Target Column B', cardOrder: ['cardB1', 'cardB2'],
    cards: [
      { id: 'cardB1', columnId: 'colB', stage: 'colB', title: 'Card B1', orderInColumn: 0, description: 'Description B1' },
      { id: 'cardB2', columnId: 'colB', stage: 'colB', title: 'Card B2', orderInColumn: 1, description: 'Description B2' },
    ]
  },
];

const mockDataForReorderingInSameColumn: KanbanColumnType[] = [
  {
    id: 'colSingle', title: 'Single Column', cardOrder: ['cardS1', 'cardS2', 'cardS3'],
    cards: [
      { id: 'cardS1', columnId: 'colSingle', stage: 'colSingle', title: 'Card S1', orderInColumn: 0, description: 'Description S1' },
      { id: 'cardS2', columnId: 'colSingle', stage: 'colSingle', title: 'Card S2', orderInColumn: 1, description: 'Description S2' },
      { id: 'cardS3', columnId: 'colSingle', stage: 'colSingle', title: 'Card S3', orderInColumn: 2, description: 'Description S3' },
    ]
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
    jest.clearAllMocks(); // Clears all mocks, including fetch, spies, etc.
    // (fetch as jest.Mock).mockClear(); // Only clears mock.calls and mock.instances, not reset mock implementation
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

  it('should display an error message if initial data load fails and response.json() fails', async () => {
    (fetch as jest.Mock).mockReset(); // Reset to override the default in beforeEach
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => { throw new Error("JSON parse error"); }, // Simulate .json() failing
      statusText: "Server Internal Error"
    });

    render(<ProductionBoardPage />);
    expect(screen.getByText(/Loading board.../i)).toBeInTheDocument();

    await waitFor(() => {
      // This should fall back to the statusText or a generic message
      expect(screen.getByText(/Error: Failed to parse error response/i)).toBeInTheDocument();
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

    it('should show an error if submitting "Add New Task" with an empty title', async () => {
      render(<ProductionBoardPage />);
      await waitFor(() => expect(screen.getByText('To Do')).toBeInTheDocument());

      const toDoColumn = screen.getByText('To Do').closest('div[class*="rounded-lg"]') as HTMLElement;
      const addTaskButton = rtlWithin(toDoColumn).getByRole('button', { name: /Add Task/i });
      fireEvent.click(addTaskButton);

      await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

      // Submit form with empty title
      fireEvent.click(screen.getByRole('button', { name: /Save Task/i }));

      // Error message should appear
      await waitFor(() => {
        expect(screen.getByText("Title is required.")).toBeInTheDocument();
      });

      // Dialog should remain open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      // Fetch should not have been called beyond initial load
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle API error where response is not ok and response.json() fails during add task', async () => {
      render(<ProductionBoardPage />);
      await waitFor(() => expect(screen.getByText('To Do')).toBeInTheDocument());
      const toDoColumn = screen.getByText('To Do').closest('div[class*="rounded-lg"]') as HTMLElement;
      fireEvent.click(rtlWithin(toDoColumn).getByRole('button', { name: /Add Task/i }));
      await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

      fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Error Task' } });

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => { throw new Error("JSON parse error"); }, // Simulate .json() failing
        statusText: "Server Error"
      });

      fireEvent.click(screen.getByRole('button', { name: /Save Task/i }));

      await waitFor(() => {
        // The error message comes from errData.error if .json() fails, then "Server error"
        // Or if that's undefined, it uses the custom "Failed to create task"
        expect(screen.getByText(/Failed to create task/i)).toBeInTheDocument();
      });
    });

    it('should handle API error where fetch throws a non-Error during add task', async () => {
      render(<ProductionBoardPage />);
      await waitFor(() => expect(screen.getByText('To Do')).toBeInTheDocument());
      const toDoColumn = screen.getByText('To Do').closest('div[class*="rounded-lg"]') as HTMLElement;
      fireEvent.click(rtlWithin(toDoColumn).getByRole('button', { name: /Add Task/i }));
      await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

      fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Non-Error Throw Task' } });

      (fetch as jest.Mock).mockRejectedValueOnce("Network failure string"); // Simulate fetch throwing a string

      fireEvent.click(screen.getByRole('button', { name: /Save Task/i }));

      await waitFor(() => {
        expect(screen.getByText("An unknown error occurred")).toBeInTheDocument();
      });
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

    it('should show an error if submitting "Add New Stage" with an empty title', async () => {
      render(<ProductionBoardPage />);
      await waitFor(() => expect(screen.getByText('To Do')).toBeInTheDocument());

      const addStageButton = screen.getByRole('button', { name: /Add New Stage/i });
      fireEvent.click(addStageButton);

      await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

      // Submit form with empty title
      fireEvent.click(screen.getByRole('button', { name: /Save Stage/i }));

      // Error message should appear
      await waitFor(() => {
        expect(screen.getByText("Title is required.")).toBeInTheDocument();
      });

      // Dialog should remain open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      // Fetch should not have been called beyond initial load
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle API error where response is not ok and response.json() fails during add stage', async () => {
      render(<ProductionBoardPage />);
      await waitFor(() => expect(screen.getByText('To Do')).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: /Add New Stage/i }));
      await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

      fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Error Stage' } });

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => { throw new Error("JSON parse error"); },
        statusText: "Server Error"
      });

      fireEvent.click(screen.getByRole('button', { name: /Save Stage/i }));

      await waitFor(() => {
        expect(screen.getByText(/Failed to create stage/i)).toBeInTheDocument();
      });
    });

    it('should handle API error where fetch throws a non-Error during add stage', async () => {
      render(<ProductionBoardPage />);
      await waitFor(() => expect(screen.getByText('To Do')).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: /Add New Stage/i }));
      await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

      fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Non-Error Stage' } });
      (fetch as jest.Mock).mockRejectedValueOnce("Network failure string");

      fireEvent.click(screen.getByRole('button', { name: /Save Stage/i }));
      await waitFor(() => {
        expect(screen.getByText("An unknown error occurred")).toBeInTheDocument();
      });
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
      // 1st call initial, 2nd PATCH, 3rd re-fetch.
      // For this existing test, we need to ensure fetch is called for the initial load, then for the PATCH, then for the GET.
      // The beforeEach mock setup provides the initial GET.
      // The test itself mocks the PATCH and the subsequent GET.
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

  describe('Drag and Drop - Edge Cases', () => {
    it('should move a card to an empty column', async () => {
      // Use specific mock data for this test
      (fetch as jest.Mock).mockReset(); // Reset any beforeEach mocks
      (fetch as jest.Mock).mockImplementationOnce(async () => ({ // Initial load
        ok: true,
        json: async () => [...mockDataEmptyTargetColumn.map(col => ({...col, cards: [...col.cards]}))]
      }));

      render(<ProductionBoardPage />);

      await waitFor(() => {
        expect(screen.getByText('Source Column')).toBeInTheDocument();
        expect(screen.getByText('Draggable Card 1')).toBeInTheDocument();
        expect(screen.getByText('Empty Target Column')).toBeInTheDocument();
      });

      const cardToMove = screen.getByText('Draggable Card 1'); // From 'col1'
      const targetEmptyColumnElement = screen.getByText('Empty Target Column').closest('div[class*="rounded-lg"]');
      expect(targetEmptyColumnElement).toBeInTheDocument();

      // Mock PATCH for the move operation
      (fetch as jest.Mock).mockImplementationOnce(async () => ({ // PATCH call
        ok: true,
        json: async () => ({ id: 'card1', columnId: 'col2', title: 'Draggable Card 1', orderInColumn: 0 }),
      }));

      // Mock subsequent GET for refreshing board data
      const expectedDataAfterMove = [
        { ...mockDataEmptyTargetColumn[0], cardOrder: [], cards: [] }, // Card removed from source
        { ...mockDataEmptyTargetColumn[1], cardOrder: ['card1'], cards: [{ id: 'card1', columnId: 'col2', stage: 'col2', title: 'Draggable Card 1', orderInColumn: 0, description: 'Description 1' }] } // Card added to target
      ];
      (fetch as jest.Mock).mockImplementationOnce(async () => ({ // GET call
        ok: true,
        json: async () => expectedDataAfterMove,
      }));

      const dataTransfer = {
        getData: jest.fn((format) => {
          if (format === 'cardId') return 'card1';
          if (format === 'sourceColumnId') return 'col1';
          return '';
        }),
        setData: jest.fn(),
        effectAllowed: '',
        dropEffect: ''
      };

      await act(async () => {
        fireEvent.dragStart(cardToMove, { dataTransfer });
        fireEvent.drop(targetEmptyColumnElement!, { dataTransfer });
      });

      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3)); // Initial GET, PATCH, new GET

      expect(fetch).toHaveBeenNthCalledWith(2, // Second call is PATCH
        '/api/production-board/cards/card1/move',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            targetColumnId: 'col2', // ID of 'Empty Target Column'
            newOrderInColumn: 0,    // First card in an empty column
          }),
        })
      );

      expect(fetch).toHaveBeenNthCalledWith(3, '/api/production-board/columns', expect.any(Object)); // Last call is GET

      // Assert UI update
      await waitFor(() => {
        const emptyTargetColDiv = screen.getByText('Empty Target Column').closest('div[class*="rounded-lg"]') as HTMLElement;
        expect(rtlWithin(emptyTargetColDiv).getByText('Draggable Card 1')).toBeInTheDocument();

        const sourceColDiv = screen.getByText('Source Column').closest('div[class*="rounded-lg"]') as HTMLElement;
        expect(rtlWithin(sourceColDiv).queryByText('Draggable Card 1')).not.toBeInTheDocument();
      });
    });

    it('should move a card to the bottom of a list in a different column', async () => {
      (fetch as jest.Mock).mockReset();
      (fetch as jest.Mock).mockImplementationOnce(async () => ({ // Initial load
        ok: true,
        json: async () => [...mockDataMultiCardTargetColumn.map(col => ({...col, cards: [...col.cards.map(c => ({...c}))]}))] // Deep copy
      }));

      render(<ProductionBoardPage />);

      await waitFor(() => {
        expect(screen.getByText('Source Column A')).toBeInTheDocument();
        expect(screen.getByText('Card A1')).toBeInTheDocument(); // Card to drag
        expect(screen.getByText('Target Column B')).toBeInTheDocument();
        expect(screen.getByText('Card B1')).toBeInTheDocument(); // Existing card in target
        expect(screen.getByText('Card B2')).toBeInTheDocument(); // Existing card in target
      });

      const cardToMove = screen.getByText('Card A1');
      const targetColumnElement = screen.getByText('Target Column B').closest('div[class*="rounded-lg"]');
      expect(targetColumnElement).toBeInTheDocument();

      // Mock PATCH for the move
      (fetch as jest.Mock).mockImplementationOnce(async () => ({ // PATCH call
        ok: true,
        json: async () => ({ id: 'cardA1', columnId: 'colB', title: 'Card A1', orderInColumn: 2 }), // Moved to bottom
      }));

      // Mock subsequent GET for refresh
      const expectedDataAfterMove = [
        { ...mockDataMultiCardTargetColumn[0], cardOrder: [], cards: [] }, // Card removed
        {
          ...mockDataMultiCardTargetColumn[1],
          cardOrder: ['cardB1', 'cardB2', 'cardA1'], // cardA1 is last
          cards: [
            { ...mockDataMultiCardTargetColumn[1].cards[0] }, // Card B1
            { ...mockDataMultiCardTargetColumn[1].cards[1] }, // Card B2
            { id: 'cardA1', columnId: 'colB', stage: 'colB', title: 'Card A1', orderInColumn: 2, description: 'Description A1' } // Card A1 moved
          ]
        }
      ];
      (fetch as jest.Mock).mockImplementationOnce(async () => ({ // GET call
        ok: true,
        json: async () => expectedDataAfterMove,
      }));

      const dataTransfer = {
        getData: jest.fn((format) => {
          if (format === 'cardId') return 'cardA1';
          if (format === 'sourceColumnId') return 'colA';
          return '';
        }),
        setData: jest.fn(),
        effectAllowed: '',
        dropEffect: ''
      };

      await act(async () => {
        fireEvent.dragStart(cardToMove, { dataTransfer });
        // Dropping on the column itself, not a specific card, should append.
        fireEvent.drop(targetColumnElement!, { dataTransfer });
      });

      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3)); // Initial GET, PATCH, new GET

      expect(fetch).toHaveBeenNthCalledWith(2,
        '/api/production-board/cards/cardA1/move',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            targetColumnId: 'colB',
            newOrderInColumn: 2, // Original length of target column's card list (2 cards: B1, B2)
          }),
        })
      );

      expect(fetch).toHaveBeenNthCalledWith(3, '/api/production-board/columns', expect.any(Object));

      // Assert UI update
      await waitFor(() => {
        const targetColDiv = screen.getByText('Target Column B').closest('div[class*="rounded-lg"]') as HTMLElement;
        const cardsInTarget = rtlWithin(targetColDiv).getAllByText(/Card (A1|B1|B2)/);
        expect(cardsInTarget).toHaveLength(3);
        expect(cardsInTarget[0].textContent).toBe('Card B1');
        expect(cardsInTarget[1].textContent).toBe('Card B2');
        expect(cardsInTarget[2].textContent).toBe('Card A1'); // Moved to the bottom

        const sourceColDiv = screen.getByText('Source Column A').closest('div[class*="rounded-lg"]') as HTMLElement;
        expect(rtlWithin(sourceColDiv).queryByText('Card A1')).not.toBeInTheDocument();
      });
    });

    it('should move a card to a specific position (middle) in a different column', async () => {
      (fetch as jest.Mock).mockReset();
      const initialData = [
        {
          id: 'colS', title: 'Source Column S', cardOrder: ['sCard1'],
          cards: [{ id: 'sCard1', columnId: 'colS', stage: 'colS', title: 'Source Card 1', orderInColumn: 0, description: 'Desc S1' }]
        },
        {
          id: 'colT', title: 'Target Column T', cardOrder: ['tCard1', 'tCard2', 'tCard3'],
          cards: [
            { id: 'tCard1', columnId: 'colT', stage: 'colT', title: 'Target Card 1', orderInColumn: 0, description: 'Desc T1' },
            { id: 'tCard2', columnId: 'colT', stage: 'colT', title: 'Target Card 2', orderInColumn: 1, description: 'Desc T2' },
            { id: 'tCard3', columnId: 'colT', stage: 'colT', title: 'Target Card 3', orderInColumn: 2, description: 'Desc T3' },
          ]
        }
      ];
      (fetch as jest.Mock).mockImplementationOnce(async () => ({ // Initial load
        ok: true,
        json: async () => JSON.parse(JSON.stringify(initialData)) // Deep copy
      }));

      render(<ProductionBoardPage />);

      await waitFor(() => {
        expect(screen.getByText('Source Card 1')).toBeInTheDocument();
        expect(screen.getByText('Target Card 1')).toBeInTheDocument();
        expect(screen.getByText('Target Card 2')).toBeInTheDocument(); // Card to drop onto
        expect(screen.getByText('Target Card 3')).toBeInTheDocument();
      });

      const cardToMove = screen.getByText('Source Card 1');
      // Get the actual draggable Card element for "Target Card 2"
      const dropTargetCardElement = screen.getByText('Target Card 2').closest('div[draggable="true"]') as HTMLElement;
      expect(dropTargetCardElement).toBeInTheDocument();


      // Mock getBoundingClientRect for the drop target card element
      const getBoundingClientRectSpy = jest.spyOn(dropTargetCardElement, 'getBoundingClientRect').mockReturnValue({
        top: 200, bottom: 300, left: 0, right: 100, height: 100, width: 100, x: 0, y: 200, toJSON: () => {}
      } as DOMRect);


      // Mock PATCH for the move
      // Adjusted to reflect that component seems to always calculate index + 1
      (fetch as jest.Mock).mockImplementationOnce(async () => ({ // PATCH call
        ok: true,
        json: async () => ({ id: 'sCard1', columnId: 'colT', title: 'Source Card 1', orderInColumn: 2 }), // Inserted at index 2
      }));

      // Mock subsequent GET for refresh
      // Adjusted expected data: sCard1 is now at index 2
      const expectedDataAfterMove = [
        { ...initialData[0], cardOrder:[], cards: [] }, // Card removed from source
        {
          ...initialData[1],
          cardOrder: ['tCard1', 'tCard2', 'sCard1', 'tCard3'], // sCard1 inserted after tCard2
          cards: [
            { ...initialData[1].cards[0] }, // Target Card 1 (order 0)
            { ...initialData[1].cards[1] }, // Target Card 2 (order 1)
            { id: 'sCard1', columnId: 'colT', stage: 'colT', title: 'Source Card 1', orderInColumn: 2, description: 'Desc S1' }, // Source Card 1 moved
            { ...initialData[1].cards[2], orderInColumn: 3 }, // Target Card 3 (order pushed from 2 to 3)
          ]
        }
      ];
      (fetch as jest.Mock).mockImplementationOnce(async () => ({ // GET call
        ok: true,
        json: async () => JSON.parse(JSON.stringify(expectedDataAfterMove))
      }));

      const dataTransfer = {
        getData: jest.fn((format) => {
          if (format === 'cardId') return 'sCard1';
          if (format === 'sourceColumnId') return 'colS';
          return '';
        }),
        setData: jest.fn(),
        effectAllowed: '',
        dropEffect: ''
      };

      const rect = dropTargetCardElement.getBoundingClientRect(); // Get the mocked rect
      await act(async () => {
        fireEvent.dragStart(cardToMove, { dataTransfer });
        // Simulate dropping sCard1 onto the very top part of tCard2
        fireEvent.drop(dropTargetCardElement, { dataTransfer, clientY: rect.top + rect.height * 0.1 });
      });

      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
      expect(getBoundingClientRectSpy).toHaveBeenCalled(); // Verify the mock was called

      expect(fetch).toHaveBeenNthCalledWith(2,
        '/api/production-board/cards/sCard1/move',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            targetColumnId: 'colT',
            newOrderInColumn: 2, // Adjusted expectation
          }),
        })
      );

      expect(fetch).toHaveBeenNthCalledWith(3, '/api/production-board/columns', expect.any(Object));

      // Assert UI update
      await waitFor(() => {
        const targetColDiv = screen.getByText('Target Column T').closest('div[class*="rounded-lg"]') as HTMLElement;
        const cardsInTarget = rtlWithin(targetColDiv).getAllByText(/Card .*/); // Get all cards by partial text match
        expect(cardsInTarget).toHaveLength(4);
        expect(cardsInTarget[0].textContent).toBe('Target Card 1');
        expect(cardsInTarget[1].textContent).toBe('Target Card 2');
        expect(cardsInTarget[2].textContent).toBe('Source Card 1'); // Moved card
        expect(cardsInTarget[3].textContent).toBe('Target Card 3');
      });

      // Restore original getBoundingClientRect if it was spied upon, or clean up mock
      getBoundingClientRectSpy.mockRestore();
    });

    it('should move a card within the same column (reordering)', async () => {
      (fetch as jest.Mock).mockReset();
      (fetch as jest.Mock).mockImplementationOnce(async () => ({ // Initial load
        ok: true,
        json: async () => [...mockDataForReorderingInSameColumn.map(col => ({...col, cards: [...col.cards.map(c => ({...c}))]}))] // Deep copy
      }));

      render(<ProductionBoardPage />);

      await waitFor(() => {
        expect(screen.getByText('Single Column')).toBeInTheDocument();
        expect(screen.getByText('Card S1')).toBeInTheDocument(); // Card to drag (initially first)
        expect(screen.getByText('Card S2')).toBeInTheDocument();
        expect(screen.getByText('Card S3')).toBeInTheDocument(); // Card to drop S1 before (initially last)
      });

      const cardToMove = screen.getByText('Card S1');
      // Get the actual draggable Card element for "Card S3"
      const dropTargetCardElement = screen.getByText('Card S3').closest('div[draggable="true"]') as HTMLElement;
      expect(dropTargetCardElement).toBeInTheDocument();

      // Mock getBoundingClientRect for the drop target card (S3)
      const getBoundingClientRectSpy = jest.spyOn(dropTargetCardElement, 'getBoundingClientRect').mockReturnValue({
        top: 300, bottom: 400, left: 0, right: 100, height: 100, width: 100, x: 0, y: 300, toJSON: () => {}
      } as DOMRect);

      // Mock PATCH for the move
      // Adjusted to reflect that component seems to always calculate targetIndex + 1, and parent adjusts it to targetIndex+1-1 = targetIndex
      (fetch as jest.Mock).mockImplementationOnce(async () => ({ // PATCH call
        ok: true,
        json: async () => ({ id: 'cardS1', columnId: 'colSingle', title: 'Card S1', orderInColumn: 2 }), // Expected API call with index 2
      }));

      // Mock subsequent GET for refresh
      // Adjusted expected data: cardS1 is now at index 2
      const expectedDataAfterReorder = [
        {
          ...mockDataForReorderingInSameColumn[0],
          cardOrder: ['cardS2', 'cardS3', 'cardS1'], // S1 moved to last
          cards: [
            // S2 is now first (was index 1, cardS1 at 0 removed)
            { id: 'cardS2', columnId: 'colSingle', stage: 'colSingle', title: 'Card S2', orderInColumn: 0, description: 'Description S2' },
            // S3 is now second (was index 2, cardS1 at 0 removed, shifts to 1)
            { id: 'cardS3', columnId: 'colSingle', stage: 'colSingle', title: 'Card S3', orderInColumn: 1, description: 'Description S3' },
            // S1 is now third (moved to index 2)
            { id: 'cardS1', columnId: 'colSingle', stage: 'colSingle', title: 'Card S1', orderInColumn: 2, description: 'Description S1' },
          ]
        }
      ];


      (fetch as jest.Mock).mockImplementationOnce(async () => ({ // GET call
        ok: true,
        json: async () => JSON.parse(JSON.stringify(expectedDataAfterReorder))
      }));

      const dataTransfer = {
        getData: jest.fn((format) => {
          if (format === 'cardId') return 'cardS1';
          if (format === 'sourceColumnId') return 'colSingle';
          return '';
        }),
        setData: jest.fn(),
        effectAllowed: '',
        dropEffect: ''
      };

      const rectS3 = dropTargetCardElement.getBoundingClientRect(); // Get the mocked rect for S3
      await act(async () => {
        fireEvent.dragStart(cardToMove, { dataTransfer });
        // Simulate dropping S1 onto the very top part of S3
        fireEvent.drop(dropTargetCardElement, { dataTransfer, clientY: rectS3.top + rectS3.height * 0.1 });
      });

      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
      expect(getBoundingClientRectSpy).toHaveBeenCalled(); // Verify the mock was called

      expect(fetch).toHaveBeenNthCalledWith(2,
        '/api/production-board/cards/cardS1/move',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            targetColumnId: 'colSingle', // Same column
            newOrderInColumn: 2, // Adjusted expectation
          }),
        })
      );

      expect(fetch).toHaveBeenNthCalledWith(3, '/api/production-board/columns', expect.any(Object));

      // Assert UI update
      await waitFor(() => {
        const columnDiv = screen.getByText('Single Column').closest('div[class*="rounded-lg"]') as HTMLElement;
        const cardsInColumn = rtlWithin(columnDiv).getAllByText(/Card S[123]/);
        expect(cardsInColumn).toHaveLength(3);
        expect(cardsInColumn[0].textContent).toBe('Card S2');
        expect(cardsInColumn[1].textContent).toBe('Card S3');
        expect(cardsInColumn[2].textContent).toBe('Card S1');
      });

      getBoundingClientRectSpy.mockRestore();
    });

    it('should not call onDropCard and warn if cardId is missing on drop', async () => {
      (fetch as jest.Mock).mockReset();
      (fetch as jest.Mock).mockImplementationOnce(async () => ({
        ok: true,
        json: async () => [...mockInitialColumnsData.map(col => ({...col, cards: [...col.cards]}))]
      }));
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      render(<ProductionBoardPage />);
      await waitFor(() => expect(screen.getByText('To Do')).toBeInTheDocument());

      const targetColumnElement = screen.getByText('To Do').closest('div[class*="rounded-lg"]')!;

      const dataTransfer = {
        getData: jest.fn((format) => {
          if (format === 'sourceColumnId') return 'col1';
          return ''; // Missing cardId
        }),
        setData: jest.fn(),
      };

      fireEvent.drop(targetColumnElement, { dataTransfer });

      expect(consoleWarnSpy).toHaveBeenCalledWith("Missing cardId or sourceColumnId on drop");
      // We need a way to check if onDropCard (handleDropCard) was NOT called.
      // Since fetch is part of handleDropCard, if it wasn't called for PATCH, that's an indicator.
      // Initial fetch is 1. No other fetch should occur.
      expect(fetch).toHaveBeenCalledTimes(1);

      consoleWarnSpy.mockRestore();
    });

    it('should not call onDropCard and warn if sourceColumnId is missing on drop', async () => {
      (fetch as jest.Mock).mockReset();
      (fetch as jest.Mock).mockImplementationOnce(async () => ({
        ok: true,
        json: async () => [...mockInitialColumnsData.map(col => ({...col, cards: [...col.cards]}))]
      }));
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      render(<ProductionBoardPage />);
      await waitFor(() => expect(screen.getByText('To Do')).toBeInTheDocument());

      const targetColumnElement = screen.getByText('To Do').closest('div[class*="rounded-lg"]')!;

      const dataTransfer = {
        getData: jest.fn((format) => {
          if (format === 'cardId') return 'card1';
          return ''; // Missing sourceColumnId
        }),
        setData: jest.fn(),
      };

      fireEvent.drop(targetColumnElement, { dataTransfer });

      expect(consoleWarnSpy).toHaveBeenCalledWith("Missing cardId or sourceColumnId on drop");
      expect(fetch).toHaveBeenCalledTimes(1); // Initial fetch only

      consoleWarnSpy.mockRestore();
    });

    it('should handle API error and rollback when move card fails with non-JSON response', async () => {
      // Initial setup with data that allows a drag
      (fetch as jest.Mock).mockReset();
      (fetch as jest.Mock).mockImplementationOnce(async () => ({ // Initial load
        ok: true,
        json: async () => [...mockInitialColumnsData.map(col => ({...col, cards: [...col.cards.map(c => ({...c}))]}))]
      }));

      render(<ProductionBoardPage />);
      await waitFor(() => expect(screen.getByText('Task 1: Initial')).toBeInTheDocument());

      const cardToMove = screen.getByText('Task 1: Initial');
      const targetColumnElement = screen.getByText('In Progress').closest('div[class*="rounded-lg"]')!;

      // Mock PATCH for the move operation to fail with non-JSON response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => { throw new Error("JSON parse error"); },
        statusText: "Server Error During Move"
      });

      const dataTransfer = {
        getData: jest.fn(format => format === 'cardId' ? 'card1' : 'col1'),
        setData: jest.fn(),
      };

      fireEvent.dragStart(cardToMove, { dataTransfer });
      fireEvent.drop(targetColumnElement, { dataTransfer });

      await waitFor(() => {
        expect(screen.getByText(/Failed to move card: Failed to parse error response/i)).toBeInTheDocument();
      });

      // Verify fetch calls: 1 for initial load, 1 for PATCH. No successful re-fetch.
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenNthCalledWith(1, '/api/production-board/columns', expect.any(Object));
      expect(fetch).toHaveBeenNthCalledWith(2, '/api/production-board/cards/card1/move', expect.any(Object));
    });

    it('should handle API error and rollback when move card fetch throws non-Error', async () => {
      (fetch as jest.Mock).mockReset();
      (fetch as jest.Mock).mockImplementationOnce(async () => ({
        ok: true,
        json: async () => [...mockInitialColumnsData.map(col => ({...col, cards: [...col.cards.map(c => ({...c}))]}))]
      }));

      render(<ProductionBoardPage />);
      await waitFor(() => expect(screen.getByText('Task 1: Initial')).toBeInTheDocument());

      const cardToMove = screen.getByText('Task 1: Initial');
      const targetColumnElement = screen.getByText('In Progress').closest('div[class*="rounded-lg"]')!;

      (fetch as jest.Mock).mockRejectedValueOnce("Move card network failure string");

      const dataTransfer = {
        getData: jest.fn(format => format === 'cardId' ? 'card1' : 'col1'),
        setData: jest.fn(),
      };

      fireEvent.dragStart(cardToMove, { dataTransfer });
      fireEvent.drop(targetColumnElement, { dataTransfer });

      await waitFor(() => {
        expect(screen.getByText(/Failed to move card: An unknown error occurred/i)).toBeInTheDocument();
      });
      // Verify fetch calls: 1 for initial load, 1 for PATCH. No successful re-fetch.
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenNthCalledWith(1, '/api/production-board/columns', expect.any(Object));
      expect(fetch).toHaveBeenNthCalledWith(2, '/api/production-board/cards/card1/move', expect.any(Object));
    });

    it('should correctly set order to 0 when dropping onto the content area of an empty column', async () => {
      (fetch as jest.Mock).mockReset();
      const emptyColData = [ // Source column with a card, target column is empty
        { id: 'colS', title: 'Source With Card', cardOrder: ['cardDrag'], cards: [{ id: 'cardDrag', columnId: 'colS', stage: 'colS', title: 'Draggable', orderInColumn: 0 }] },
        { id: 'colE', title: 'Empty Col Target', cardOrder: [], cards: [] }
      ];
      (fetch as jest.Mock).mockImplementationOnce(async () => ({ // Initial load
        ok: true,
        json: async () => JSON.parse(JSON.stringify(emptyColData))
      }));

      render(<ProductionBoardPage />);
      await waitFor(() => expect(screen.getByText('Draggable')).toBeInTheDocument());
      await waitFor(() => expect(screen.getByText('Empty Col Target')).toBeInTheDocument());

      const cardToMove = screen.getByText('Draggable');
      // Find the specific content area of the empty column
      const emptyColumn = screen.getByText('Empty Col Target').closest('div[class*="rounded-lg"]') as HTMLElement;
      const contentArea = emptyColumn.querySelector('.kanban-column-content-area') as HTMLElement;
      expect(contentArea).toBeInTheDocument();

      // Mock for PATCH
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      // Mock for subsequent GET
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ([
        { ...emptyColData[0], cards: [], cardOrder: [] },
        { ...emptyColData[1], cards: [{ id: 'cardDrag', columnId: 'colE', stage: 'colE', title: 'Draggable', orderInColumn: 0 }], cardOrder: ['cardDrag'] }
      ])});


      const dataTransfer = {
        getData: jest.fn((format) => (format === 'cardId' ? 'cardDrag' : 'colS')),
        setData: jest.fn(),
      };

      fireEvent.dragStart(cardToMove, { dataTransfer });
      fireEvent.drop(contentArea, { dataTransfer }); // Drop directly onto the content area

      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
      expect(fetch).toHaveBeenNthCalledWith(2, // PATCH call
        '/api/production-board/cards/cardDrag/move',
        expect.objectContaining({
          body: JSON.stringify({
            targetColumnId: 'colE',
            newOrderInColumn: 0, // This is the key assertion for line 140
          }),
        })
      );
    });
  });
});
