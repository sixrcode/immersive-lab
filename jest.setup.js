// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock next/font before any components that might use it are imported
// This is a common workaround for Jest environments.
jest.mock('next/font/google', () => ({
  Inter: () => ({
    style: {
      fontFamily: 'mocked-inter-font',
    },
  }),
  Roboto_Mono: () => ({
    style: {
      fontFamily: 'mocked-roboto-mono-font',
    },
  }),
  // Add any other fonts your app uses
}));


// Mock for HTMLCanvasElement.toDataURL, if not provided by jsdom
if (typeof HTMLCanvasElement !== 'undefined' && !HTMLCanvasElement.prototype.toDataURL) {
  HTMLCanvasElement.prototype.toDataURL = function (type?: string, quality?: any) {
    return `data:image/png;base64,mocked_canvas_image_data_for_${type}_${quality}`; //NOSONAR
  };
}

// Mock for matchMedia, if not provided by jsdom
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}
