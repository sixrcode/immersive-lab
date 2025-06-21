import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PrototypeDisplay } from '../prototype-display'; // Adjust path
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PromptPackage, MoodBoardCell } from '@/lib/types';

// Mock the useToast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock child UI components as needed, similar to prompt-input.test.tsx if they are complex
// For simplicity, we'll assume they render content passed to them.
// If specific UI components have complex logic that interferes, they should be mocked.
jest.mock('@/components/ui/card', () => {
  const MockCard = (props: { children: React.ReactNode }) => <div data-testid="card">{props.children}</div>; MockCard.displayName = 'MockCard';
  const MockCardContent = (props: { children: React.ReactNode }) => <div data-testid="card-content">{props.children}</div>; MockCardContent.displayName = 'MockCardContent';
  const MockCardHeader = (props: { children: React.ReactNode }) => <div data-testid="card-header">{props.children}</div>; MockCardHeader.displayName = 'MockCardHeader';
  const MockCardTitle = (props: { children: React.ReactNode }) => <div data-testid="card-title">{props.children}</div>; MockCardTitle.displayName = 'MockCardTitle';
  const MockCardDescription = (props: { children: React.ReactNode }) => <div data-testid="card-description">{props.children}</div>; MockCardDescription.displayName = 'CardDescription';
  return { Card: MockCard, CardContent: MockCardContent, CardHeader: MockCardHeader, CardTitle: MockCardTitle, CardDescription: MockCardDescription };
});
jest.mock('@/components/ui/badge', () => {
  const MockBadge = React.forwardRef<HTMLSpanElement, { children: React.ReactNode; variant?: string }>(
    (props, ref) => <span ref={ref} data-testid="badge" className={`variant-${props.variant}`}>{props.children}</span>
  );
  MockBadge.displayName = 'Badge';
  return { Badge: MockBadge };
});
jest.mock('@/components/ui/button', () => {
  const MockButton = React.forwardRef<HTMLButtonElement, { children: React.ReactNode; title?: string; "data-testid"?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>>(
    (props, ref) => {
      const testId = props["data-testid"] || `button-${props.title || (typeof props.children === 'string' ? props.children : 'complex')}`;
      return <button ref={ref} data-testid={testId} {...props}>{props.children}</button>;
    }
  );
  MockButton.displayName = 'Button';
  return { Button: MockButton };
});
jest.mock('@/components/ui/table', () => {
  type MockTableProps = React.HTMLAttributes<HTMLTableElement> & { children?: React.ReactNode };
  const MockTable = React.forwardRef<HTMLTableElement, MockTableProps>((props, ref) => <table ref={ref} data-testid="table" {...props}>{props.children}</table>); MockTable.displayName = "Table";

  type MockTableBodyProps = React.HTMLAttributes<HTMLTableSectionElement> & { children?: React.ReactNode };
  const MockTableBody = React.forwardRef<HTMLTableSectionElement, MockTableBodyProps>((props, ref) => <tbody ref={ref} data-testid="table-body" {...props}>{props.children}</tbody>); MockTableBody.displayName = "TableBody";

  type MockTableCellProps = React.TdHTMLAttributes<HTMLTableCellElement> & { children?: React.ReactNode };
  const MockTableCell = React.forwardRef<HTMLTableCellElement, MockTableCellProps>((props, ref) => <td ref={ref} data-testid="table-cell" {...props}>{props.children}</td>); MockTableCell.displayName = "TableCell";

  type MockTableHeadProps = React.ThHTMLAttributes<HTMLTableCellElement> & { children?: React.ReactNode };
  const MockTableHead = React.forwardRef<HTMLTableCellElement, MockTableHeadProps>((props, ref) => <th ref={ref} data-testid="table-head" {...props}>{props.children}</th>); MockTableHead.displayName = "TableHead";

  type MockTableHeaderProps = React.HTMLAttributes<HTMLTableSectionElement> & { children?: React.ReactNode };
  const MockTableHeader = React.forwardRef<HTMLTableSectionElement, MockTableHeaderProps>((props, ref) => <thead ref={ref} data-testid="table-header" {...props}>{props.children}</thead>); MockTableHeader.displayName = "TableHeader";

  type MockTableRowProps = React.HTMLAttributes<HTMLTableRowElement> & { children?: React.ReactNode };
  const MockTableRow = React.forwardRef<HTMLTableRowElement, MockTableRowProps>((props, ref) => <tr ref={ref} data-testid="table-row" {...props}>{props.children}</tr>); MockTableRow.displayName = "TableRow";
  return {
    Table: MockTable,
    TableBody: MockTableBody,
    TableCell: MockTableCell,
    TableHead: MockTableHead,
    TableHeader: MockTableHeader,
    TableRow: MockTableRow,
  };
});
jest.mock('@/components/ui/separator', () => {
  type MockSeparatorProps = React.HTMLAttributes<HTMLHRElement>; // Separator usually doesn't have children
  const MockSeparator = React.forwardRef<HTMLHRElement, MockSeparatorProps>(
    (props, ref) => <hr ref={ref} data-testid="separator" {...props} />
  );
  MockSeparator.displayName = 'Separator';
  return { Separator: MockSeparator };
});


const mockPromptPackage: PromptPackage = {
  id: 'testpkg001',
  userId: 'user01',
  prompt: 'A futuristic city skyline at dusk.',
  stylePreset: 'cyberpunk',
  originalImageURL: 'https://example.com/original.jpg',
  createdAt: new Date('2023-10-26T10:00:00Z'),
  updatedAt: new Date('2023-10-26T10:05:00Z'),
  loglines: [
    { tone: 'Gritty', text: 'In a rain-soaked city of neon and shadows, a detective hunts a ghost.' },
    { tone: 'Hopeful', text: 'Even in the darkest alleys, a flicker of rebellion ignites change.' },
  ],
  moodBoard: {
    generatedImageURL: 'https://example.com/moodboard_gen.png',
    cells: Array(9).fill(null).map((_, i) => ({
      title: `Key Theme ${i + 1}`,
      description: `Description for theme ${i + 1}, exploring visual concepts.`,
    })),
  },
  shotList: [
    { shotNumber: 1, lens: '24mm', cameraMove: 'Establishing Shot - Slow Pan', framingNotes: 'Wide view of the neon-lit skyscrapers.' },
    { shotNumber: 2, lens: '85mm', cameraMove: 'Close Up - Rack Focus', framingNotes: 'Focus on detective\'s determined eyes.' },
  ],
  animaticDescription: 'A sequence showing key moments: the detective entering a bar, a chase scene, a final confrontation.',
  pitchSummary: 'A thrilling cyberpunk adventure exploring themes of identity and resistance in a dystopian future.',
  version: 1,
};

describe('PrototypeDisplay Component', () => {
  const mockOnRegenerate = jest.fn();
  const queryClient = new QueryClient();

  beforeEach(() => {
    mockOnRegenerate.mockClear();
    // Mock URL.createObjectURL and URL.revokeObjectURL for download test
    global.URL.createObjectURL = jest.fn(() => 'blob:http://localhost/mock-blob-url');
    global.URL.revokeObjectURL = jest.fn();
    // HTMLAnchorElement.prototype.click = jest.fn(); // Removed from beforeEach
  });
   afterEach(() => {
    // delete (global.URL as any).createObjectURL;
    // delete (global.URL as any).revokeObjectURL;
  });


  it('renders null if no promptPackage is provided', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <PrototypeDisplay promptPackage={null} />
      </QueryClientProvider>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders all sections with correct data from promptPackage', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PrototypeDisplay promptPackage={mockPromptPackage} onRegenerate={mockOnRegenerate} />
      </QueryClientProvider>
    );

    // Check User Input section
    expect(screen.getByText(mockPromptPackage.prompt)).toBeInTheDocument();
    expect(screen.getByText(mockPromptPackage.stylePreset!)).toBeInTheDocument();
    expect(screen.getByAltText('User uploaded reference')).toHaveAttribute('src', mockPromptPackage.originalImageURL);
    expect(screen.getByText(new RegExp(mockPromptPackage.id))).toBeInTheDocument();


    // Check Loglines
    mockPromptPackage.loglines.forEach(logline => {
      expect(screen.getByText(logline.tone)).toBeInTheDocument();
      expect(screen.getByText(logline.text)).toBeInTheDocument();
    });

    // Check Mood Board
    expect(screen.getByAltText('AI Generated Mood Board')).toHaveAttribute('src', mockPromptPackage.moodBoard.generatedImageURL);
    mockPromptPackage.moodBoard.cells.forEach((cell: MoodBoardCell) => {
      expect(screen.getByText(cell.title)).toBeInTheDocument();
      expect(screen.getByText(cell.description)).toBeInTheDocument();
    });

    // Check Shot List
    mockPromptPackage.shotList.forEach(shot => {
      expect(screen.getByText(shot.shotNumber.toString())).toBeInTheDocument();
      expect(screen.getByText(shot.lens)).toBeInTheDocument();
      expect(screen.getByText(shot.cameraMove)).toBeInTheDocument();
      expect(screen.getByText(shot.framingNotes)).toBeInTheDocument();
    });

    // Check Animatic Description
    expect(screen.getByText(mockPromptPackage.animaticDescription)).toBeInTheDocument();

    // Check Pitch Summary
    expect(screen.getByText(mockPromptPackage.pitchSummary)).toBeInTheDocument();
  });

  it('renders placeholder "Regenerate" buttons for sections', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PrototypeDisplay promptPackage={mockPromptPackage} onRegenerate={mockOnRegenerate} />
      </QueryClientProvider>
    );
    // screen.debug(undefined, 100000); // Keep debug for now, will remove once stable
    // Example: Check a few regenerate buttons
    // Note: The button text/title might be dynamic based on sectionName
    // These data-testids are added directly in the RegenerateButton component in prototype-display.tsx
    expect(screen.getByTestId('button-Regenerate Loglines')).toBeInTheDocument();
    expect(screen.getByTestId('button-Regenerate Mood Board')).toBeInTheDocument();
    expect(screen.getByTestId('button-Regenerate Shot List')).toBeInTheDocument();
    // Could also count them if a more generic selector is feasible
  });

  it('handles "Download JSON" button click and triggers download', () => {
    const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation((node: Node) => node);
    const removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation((node: Node) => node);
    const originalClick = HTMLAnchorElement.prototype.click; // Save original
    HTMLAnchorElement.prototype.click = jest.fn(); // Mock for this test only

    render(
      <QueryClientProvider client={queryClient}>
        <PrototypeDisplay promptPackage={mockPromptPackage} />
      </QueryClientProvider>
    );

    const downloadButton = screen.getByTestId('download-json-button'); // Use the explicit data-testid
    fireEvent.click(downloadButton);

    // expect(JSON.stringify).toHaveBeenCalledWith(mockPromptPackage, null, 2); // JSON.stringify is not a spy
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();

    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();

    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
    HTMLAnchorElement.prototype.click = originalClick; // Restore original click
  });

  it('does not render original image if URL is not provided', () => {
    const pkgWithoutOriginalImage = { ...mockPromptPackage, originalImageURL: undefined };
    render(
      <QueryClientProvider client={queryClient}>
        <PrototypeDisplay promptPackage={pkgWithoutOriginalImage} />
      </QueryClientProvider>
    );
    expect(screen.queryByAltText('User uploaded reference')).not.toBeInTheDocument();
  });

});
