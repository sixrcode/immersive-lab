// packages/storyboard-studio/src/components/scene-input/SceneInputForm.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'; // For extended matchers like .toBeInTheDocument()

import SceneInputForm from './SceneInputForm';

// Mock the GenerateStoryboardProps type if it's imported from @isl/types
// jest.mock('@isl/types', () => ({
//   ...jest.requireActual('@isl/types'), // if you have other exports
//   GenerateStoryboardProps: jest.fn(),
// }));

describe('SceneInputForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
    // Mock window.alert - SceneInputForm uses it for basic validation feedback
    global.alert = jest.fn();
  });

  test('renders all input fields and the submit button', () => {
    render(<SceneInputForm onSubmit={mockOnSubmit} />);

    expect(screen.getByLabelText(/Scene Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Panel Count \(2-10\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Style Preset/i)).toBeInTheDocument();
    // expect(screen.getByLabelText(/Reference Image \(Optional\)/i)).toBeInTheDocument(); // Uncomment if image input is active
    expect(screen.getByRole('button', { name: /Generate Storyboard/i })).toBeInTheDocument();
  });

  test('allows typing into text fields and changing panel count', () => {
    render(<SceneInputForm onSubmit={mockOnSubmit} />);

    const sceneInput = screen.getByLabelText(/Scene Description/i) as HTMLTextAreaElement;
    fireEvent.change(sceneInput, { target: { value: 'A test scene' } });
    expect(sceneInput.value).toBe('A test scene');

    const panelCountInput = screen.getByLabelText(/Panel Count \(2-10\)/i) as HTMLInputElement;
    fireEvent.change(panelCountInput, { target: { value: '5' } });
    expect(panelCountInput.value).toBe('5');

    const stylePresetInput = screen.getByLabelText(/Style Preset/i) as HTMLInputElement;
    fireEvent.change(stylePresetInput, { target: { value: 'cartoon' } });
    expect(stylePresetInput.value).toBe('cartoon');
  });

  test('calls onSubmit with correct data when form is valid and submitted', async () => {
    render(<SceneInputForm onSubmit={mockOnSubmit} />);

    fireEvent.change(screen.getByLabelText(/Scene Description/i), { target: { value: 'A valid scene' } });
    fireEvent.change(screen.getByLabelText(/Panel Count \(2-10\)/i), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(/Style Preset/i), { target: { value: 'fantasy' } });

    fireEvent.click(screen.getByRole('button', { name: /Generate Storyboard/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      expect(mockOnSubmit).toHaveBeenCalledWith({
        sceneDescription: 'A valid scene',
        panelCount: 3,
        stylePreset: 'fantasy',
        // referenceImage: null, // if image input is active
      });
    });
  });

  test('shows alert and does not call onSubmit if scene description is empty', async () => {
    render(<SceneInputForm onSubmit={mockOnSubmit} />);

    fireEvent.change(screen.getByLabelText(/Panel Count \(2-10\)/i), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate Storyboard/i }));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Please enter a scene description.');
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  test('shows alert and does not call onSubmit if panel count is less than 2', async () => {
    render(<SceneInputForm onSubmit={mockOnSubmit} />);

    fireEvent.change(screen.getByLabelText(/Scene Description/i), { target: { value: 'A scene' } });
    fireEvent.change(screen.getByLabelText(/Panel Count \(2-10\)/i), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate Storyboard/i }));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Panel count must be between 2 and 10.');
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  test('shows alert and does not call onSubmit if panel count is greater than 10', async () => {
    render(<SceneInputForm onSubmit={mockOnSubmit} />);

    fireEvent.change(screen.getByLabelText(/Scene Description/i), { target: { value: 'A scene' } });
    fireEvent.change(screen.getByLabelText(/Panel Count \(2-10\)/i), { target: { value: '11' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate Storyboard/i }));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Panel count must be between 2 and 10.');
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  test('disables submit button when isLoading is true', () => {
    render(<SceneInputForm onSubmit={mockOnSubmit} isLoading={true} />);
    const submitButton = screen.getByRole('button', { name: /Generating.../i });
    expect(submitButton).toBeDisabled();
  });
});
