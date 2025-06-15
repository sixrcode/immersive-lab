import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PrototypeDisplay } from '../prototype-display'; // Adjust path
import type { PromptPackage } from '@/lib/types';

// Mock child UI components as needed, similar to prompt-input.test.tsx if they are complex
// For simplicity, we'll assume they render content passed to them.
// If specific UI components have complex logic that interferes, they should be mocked.
jest.mock('@/components/ui/card', () => {
  const MockCard = (props: { children: React.ReactNode }) => <div data-testid="card">{props.children}</div>; MockCard.displayName = 'MockCard';
  const MockCardContent = (props: { children: React.ReactNode }) => <div data-testid="card-content">{props.children}</div>; MockCardContent.displayName = 'MockCardContent';
  const MockCardHeader = (props: { children: React.ReactNode }) => <div data-testid="card-header">{props.children}</div>; MockCardHeader.displayName = 'MockCardHeader';
  const MockCardTitle = (props: { children: React.ReactNode }) => <div data-testid="card-title">{props.children}</div>; MockCardTitle.displayName = 'MockCardTitle';
  const MockCardDescription = (props: { children: React.ReactNode }) => <div data-testid="card-description">{props.children}</div>; MockCardDescription.displayName = 'MockCardDescription';
  return { Card: MockCard, CardContent: MockCardContent, CardHeader: MockCardHeader, CardTitle: MockCardTitle, CardDescription: MockCardDescription };
});
jest.mock('@/components/ui/badge', () => { const MockBadge = (props: { children: React.ReactNode }) => <span data-testid="badge">{props.children}</span>; MockBadge.displayName = 'MockBadge'; return MockBadge; });
jest.mock('@/components/ui/button', () => {
  const MockButton = (props: { children: React.ReactNode; title?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) =>
    <button data-testid={`button-${props.children || props.title || 'untitled'}`} {...props} >{props.children}</button>;
  MockButton.displayName = 'MockButton'; return MockButton;
});
jest.mock('@/components/ui/table', () => ({

  Table: (props: any) => <table data-testid="table">{props.children}</table>,
  TableBody: (props: any) => <tbody data-testid="table-body">{props.children}</tbody>,
  TableCell: (props: any) => <td data-testid="table-cell">{props.children}</td>,
  TableHead: (props: any) => <th data-testid="table-head">{props.children}</th>,
  TableHeader: (props: any) => <thead data-testid="table-header">{props.children}</thead>,
  TableRow: (props: any) => <tr data-testid="table-row">{props.children}</tr>,
}));
jest.mock('@/components/ui/separator', () => { const MockSeparator = (props: any) => <hr data-testid="separator" {...props} />; MockSeparator.displayName = 'MockSeparator'; return MockSeparator; });


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

  beforeEach(() => {
    mockOnRegenerate.mockClear();
    // Mock URL.createObjectURL and URL.revokeObjectURL for download test
    global.URL.createObjectURL = jest.fn(() => 'blob:http://localhost/mock-blob-url');
    global.URL.revokeObjectURL = jest.fn();
    // Mock anchor element click for download
    HTMLAnchorElement.prototype.click = jest.fn();
    // HTMLAnchorElement.prototype.setAttribute = jest.fn();
    // HTMLAnchorElement.prototype.removeAttribute = jest.fn();
    // document.body.appendChild = jest.fn();
    // document.body.removeChild = jest.fn();

  });
   afterEach(() => {
    // delete (HTMLAnchorElement.prototype as any).click;
    // delete (global.URL as any).createObjectURL;
    // delete (global.URL as any).revokeObjectURL;
  });


  it('renders null if no promptPackage is provided', () => {
    const { container } = render(<PrototypeDisplay promptPackage={null as any} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders all sections with correct data from promptPackage', () => {
    render(<PrototypeDisplay promptPackage={mockPromptPackage} onRegenerate={mockOnRegenerate} />);

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
    render(<PrototypeDisplay promptPackage={mockPromptPackage} onRegenerate={mockOnRegenerate} />);
    // Example: Check a few regenerate buttons
    // Note: The button text/title might be dynamic based on sectionName
    expect(screen.getByTestId('button-Regenerate Loglines')).toBeInTheDocument();
    expect(screen.getByTestId('button-Regenerate Mood Board')).toBeInTheDocument();
    expect(screen.getByTestId('button-Regenerate Shot List')).toBeInTheDocument();
    // Could also count them if a more generic selector is feasible
  });

  it('handles "Download JSON" button click and triggers download', () => {
    const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation((node: Node) => node);
    const removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation((node: Node) => node);

    render(<PrototypeDisplay promptPackage={mockPromptPackage} />);

    const downloadButton = screen.getByTestId('button-Download JSON'); // Using the text content to find it
    fireEvent.click(downloadButton);

    expect(JSON.stringify).toHaveBeenCalledWith(mockPromptPackage, null, 2);
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();

    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();

    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it('does not render original image if URL is not provided', () => {
    const pkgWithoutOriginalImage = { ...mockPromptPackage, originalImageURL: undefined };
    render(<PrototypeDisplay promptPackage={pkgWithoutOriginalImage} />);
    expect(screen.queryByAltText('User uploaded reference')).not.toBeInTheDocument();
  });

});
