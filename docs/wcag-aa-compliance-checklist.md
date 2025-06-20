# WCAG 2.1 Level AA Compliance Checklist for New UI Components

## Introduction

This document provides a checklist to guide developers in creating new UI components that strive to meet the Web Content Accessibility Guidelines (WCAG) 2.1 Level A and AA success criteria. Adhering to these guidelines helps ensure that our UI components are accessible to people with a wide range of disabilities.

This checklist is a summary of key criteria relevant to UI component development and is not exhaustive. Developers should refer to the full [WCAG 2.1 Guidelines](https://www.w3.org/TR/WCAG21/) for detailed explanations, techniques, and further guidance.

## Checklist by WCAG Principle

The checklist is organized under the four main WCAG principles: Perceivable, Operable, Understandable, and Robust (POUR).

### 1. Perceivable

Information and user interface components must be presentable to users in ways they can perceive.

#### 1.1 Text Alternatives
*   **1.1.1 Non-text Content (Level A):**
    *   [ ] Are text alternatives (e.g., `alt` text, `aria-label`) provided for all non-text content such as UI controls (icons, buttons without visible text), and important graphics?
    *   [ ] For decorative images or images that don't convey information, is `alt=""` used or are they implemented as CSS backgrounds?

#### 1.3 Adaptable
*   **1.3.1 Info and Relationships (Level A):**
    *   [ ] Is information, structure (e.g., headings, lists, sections), and relationships (e.g., form field to label, table headers to cells) conveyed through presentation programmatically determinable or available in text (e.g., using semantic HTML, ARIA attributes like `role`, `aria-labelledby`, `aria-describedby`)?
    *   [ ] Are form inputs correctly associated with their labels (e.g., using `<label for="...">` or `aria-labelledby`)?
*   **1.3.2 Meaningful Sequence (Level A):**
    *   [ ] If the sequence in which content is presented affects its meaning, can a correct reading sequence be programmatically determined (e.g., DOM order makes sense)?
*   **1.3.4 Orientation (Level AA):**
    *   [ ] Does the component's content display correctly in both portrait and landscape orientations, unless a specific display orientation is essential?
*   **1.3.5 Identify Input Purpose (Level AA):**
    *   [ ] For input fields that collect information about the user, is the purpose of each input programmatically identified using appropriate `autocomplete` attributes (e.g., `autocomplete="name"`, `autocomplete="email"`)?

#### 1.4 Distinguishable
*   **1.4.1 Use of Color (Level A):**
    *   [ ] Is color not used as the only visual means of conveying information, indicating an action, prompting a response, or distinguishing a visual element (e.g., provide text labels, icons, or other visual cues in addition to color for error states, links)?
*   **1.4.3 Contrast (Minimum) (Level AA):**
    *   [ ] Does text and images of text have a contrast ratio of at least 4.5:1 against their background?
    *   [ ] Does large-scale text (18pt or 14pt bold) and images of large-scale text have a contrast ratio of at least 3:1?
*   **1.4.4 Resize text (Level AA):**
    *   [ ] Can text be resized up to 200 percent without loss of content or functionality (e.g., using relative units for text and containers, testing with browser zoom)?
*   **1.4.5 Images of Text (Level AA):**
    *   [ ] Is text used to convey information rather than images of text, whenever the visual presentation can be achieved with styled text? (Exceptions: logotypes, essential images of text).
*   **1.4.10 Reflow (Level AA):**
    *   [ ] Can content be presented without loss of information or functionality, and without requiring scrolling in two dimensions, when viewed at a width equivalent to 320 CSS pixels or a height equivalent to 256 CSS pixels? (Exceptions for content requiring two-dimensional layout like maps, data tables).
*   **1.4.11 Non-text Contrast (Level AA):**
    *   [ ] Do user interface components (e.g., input borders, button boundaries) and graphical objects (e.g., icons, important parts of charts) have a contrast ratio of at least 3:1 against adjacent color(s)?
    *   [ ] Do states of components (e.g., focused, selected, pressed) also meet this 3:1 contrast requirement?
*   **1.4.12 Text Spacing (Level AA):**
    *   [ ] Is there no loss of content or functionality when users adjust text spacing properties (line height to 1.5 times font size; spacing following paragraphs to 2 times font size; letter spacing to 0.12 times font size; word spacing to 0.16 times font size)?
*   **1.4.13 Content on Hover or Focus (Level AA):**
    *   [ ] If additional content appears on hover or focus (e.g., tooltips, custom dropdowns):
        *   [ ] Is there a mechanism to dismiss the additional content without moving pointer hover or keyboard focus (e.g., Esc key)?
        *   [ ] Can the user hover over the additional content itself without it disappearing?
        *   [ ] Does the additional content remain visible until hover or focus is removed, the user dismisses it, or its information is no longer valid?

### 2. Operable

User interface components and navigation must be operable.

#### 2.1 Keyboard Accessible
*   **2.1.1 Keyboard (Level A):**
    *   [ ] Is all functionality of the component available using only a keyboard interface, without requiring specific timings for individual keystrokes?
    *   [ ] Are custom interactive elements (e.g., sliders, custom selects) fully keyboard operable?
*   **2.1.2 No Keyboard Trap (Level A):**
    *   [ ] If keyboard focus can be moved to a component using a keyboard interface, can focus then be moved away from that component using only a keyboard interface? (e.g., modals allow focus to be returned to the main page).
*   **2.1.4 Character Key Shortcuts (Level A):**
    *   [ ] If single-character key shortcuts are used within the component, can they be turned off, remapped by the user, or are they only active when the component has focus?

#### 2.2 Enough Time
*   **2.2.1 Timing Adjustable (Level A):**
    *   [ ] If the component uses time limits (rare for individual components, more for processes), can the user turn off, adjust, or extend the time limit before encountering it? (Exceptions apply).
*   **2.2.2 Pause, Stop, Hide (Level A):**
    *   [ ] For any moving, blinking, scrolling, or auto-updating information (e.g., carousels, animations, live tickers) that starts automatically and lasts more than five seconds:
        *   [ ] Is there a mechanism for the user to pause, stop, or hide it?
        *   [ ] If it's part of a group of parallel content, is the mechanism easily accessible?

#### 2.4 Navigable
*   **2.4.3 Focus Order (Level A):**
    *   [ ] If a web page or component can be navigated sequentially and the navigation sequences affect meaning or operation, do focusable components receive focus in an order that preserves meaning and operability?
*   **2.4.4 Link Purpose (In Context) (Level A):**
    *   [ ] If the component contains links, is the purpose of each link clear from its link text alone, or from the link text together with its programmatically determined link context (e.g., surrounding text, list item, table cell, `aria-label`)?
*   **2.4.6 Headings and Labels (Level AA):**
    *   [ ] If the component renders its own headings (e.g., within a complex widget) or form field labels, do these headings and labels accurately describe the topic or purpose of the content they introduce?
*   **2.4.7 Focus Visible (Level AA):**
    *   [ ] Is there a highly visible keyboard focus indicator when interactive elements within the component receive focus? (Avoid removing default browser outlines without providing a clear, custom alternative).

### 3. Understandable

Information and the operation of user interface must be understandable.

#### 3.2 Predictable
*   **3.2.1 On Focus (Level A):**
    *   [ ] When any UI component receives focus, does it avoid initiating an unexpected change of context (e.g., automatically submitting a form, opening a new window)?
*   **3.2.2 On Input (Level A):**
    *   [ ] Does changing the setting of any UI component (e.g., selecting a radio button, typing in an input field) avoid automatically causing an unexpected change of context unless the user has been advised of the behavior before using the component?
*   **3.2.4 Consistent Identification (Level AA):**
    *   [ ] Are components that have the same functionality within a set of web pages (or a single page application's views) identified consistently (e.g., same labels for icons, same text for similar actions)?

#### 3.3 Input Assistance
*   **3.3.1 Error Identification (Level A):**
    *   [ ] If an input error is automatically detected in a form within the component, is the item that is in error identified, and the error described to the user in text?
    *   [ ] Are error messages specific and easy to understand?
*   **3.3.2 Labels or Instructions (Level A):**
    *   [ ] Are labels or instructions provided when user input is required in the component?
*   **3.3.3 Error Suggestion (Level AA):**
    *   [ ] If an input error is automatically detected and suggestions for correction are known and can be provided without jeopardizing security or purpose, are these suggestions provided to the user?

### 4. Robust

Content must be robust enough that it can be interpreted reliably by a wide variety of user agents, including assistive technologies.

#### 4.1 Compatible
*   **4.1.1 Parsing (Level A):**
    *   [ ] (Primarily page-level, but applies to component markup) Is the component's markup free of major parsing errors (e.g., duplicate IDs, improperly nested elements, unclosed tags) that could prevent assistive technologies from understanding its structure?
*   **4.1.2 Name, Role, Value (Level A):**
    *   [ ] For all user interface components (including form elements, links, and components generated by scripts), can the name (e.g., label) and role (e.g., button, link, checkbox) be programmatically determined?
    *   [ ] Can states (e.g., checked, expanded), properties (e.g., `aria-required`), and values (e.g., current value of a slider) that can be set by the user be programmatically set?
    *   [ ] Are changes to these states, properties, and values automatically notified to assistive technologies (e.g., using ARIA live regions or appropriate ARIA attributes)?
*   **4.1.3 Status Messages (Level AA):**
    *   [ ] For status messages that provide feedback on the outcome of an action (e.g., "Item added to cart", "Form submitted successfully", loading states) within the component, can these messages be programmatically determined through role or properties (e.g., `role="status"`, `aria-live`) so that assistive technologies can present them to the user without the message receiving focus?

## Conclusion

Building accessible UI components is an essential part of creating inclusive digital experiences. This checklist serves as a starting point and a reminder of key WCAG 2.1 Level A and AA criteria.

It is highly recommended to:
*   Use automated accessibility testing tools (like the `axe-core` integration with Jest) during development.
*   Perform manual testing, including keyboard-only navigation and testing with screen readers.
*   Involve users with disabilities in testing where possible.

Continuously learning and applying accessibility best practices will lead to more robust and user-friendly components for everyone.
