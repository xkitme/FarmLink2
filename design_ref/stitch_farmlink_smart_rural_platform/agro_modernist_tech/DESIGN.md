---
name: Agro-Modernist Tech
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#40493d'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f1f1'
  outline: '#707a6c'
  outline-variant: '#bfcaba'
  surface-tint: '#1b6d24'
  primary: '#0d631b'
  on-primary: '#ffffff'
  primary-container: '#2e7d32'
  on-primary-container: '#cbffc2'
  inverse-primary: '#88d982'
  secondary: '#7a5649'
  on-secondary: '#ffffff'
  secondary-container: '#fdcdbc'
  on-secondary-container: '#795548'
  tertiary: '#734e00'
  on-tertiary: '#ffffff'
  tertiary-container: '#926500'
  on-tertiary-container: '#ffefda'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a3f69c'
  primary-fixed-dim: '#88d982'
  on-primary-fixed: '#002204'
  on-primary-fixed-variant: '#005312'
  secondary-fixed: '#ffdbcf'
  secondary-fixed-dim: '#ebbcac'
  on-secondary-fixed: '#2e150b'
  on-secondary-fixed-variant: '#603f33'
  tertiary-fixed: '#ffdeac'
  tertiary-fixed-dim: '#ffba38'
  on-tertiary-fixed: '#281900'
  on-tertiary-fixed-variant: '#604100'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  headline-lg:
    fontFamily: Noto Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Noto Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Noto Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Noto Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Noto Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: Noto Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Noto Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.04em
  headline-lg-mobile:
    fontFamily: Noto Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  unit: 8px
  margin-mobile: 20px
  gutter-mobile: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
---

## Brand & Style

The design system is built upon the concept of **Technological Vitality**, serving as a bridge between the physical soil and the digital cloud. It aims to evoke a sense of professional reliability, organic growth, and accessible innovation. 

The aesthetic is **Modern/Corporate** with **Tactile** influences. It avoids the coldness of traditional enterprise software by introducing soft shapes and nature-derived hues. The UI is designed to be highly legible in high-glare outdoor environments, prioritizing high-contrast ratios and large touch targets to accommodate farmers and field operators. The interface feels clean and systematic, yet grounded in the earth.

## Colors

The palette is rooted in the natural cycle of agriculture. 
- **Vibrant Leaf Green** is the primary driver, used for key actions and growth-related data points.
- **Earthy Brown** provides a grounding element for secondary navigation and structural components.
- **Golden Wheat** acts as a celebratory accent for successful harvests, premium insights, and attention-grabbing notifications.
- **Soft Off-white** is the foundational canvas, reducing eye strain and providing a clean backdrop for high-density information.
- **Alert Red** and **Warning Orange** are reserved strictly for environmental hazards, pest alerts, and system criticalities.

## Typography

The design system utilizes **Noto Sans** across all levels to ensure maximum cross-platform compatibility and international readability. The type scale is intentionally generous to support accessibility in outdoor conditions. 

Headlines are bold and authoritative, using tighter letter spacing to create a sense of modern precision. Body text maintains a relaxed line height to improve scanning during field use. Labels and metadata use a slightly increased letter spacing and semi-bold weight to remain legible even at smaller sizes or on lower-resolution mobile displays.

## Layout & Spacing

This design system employs a **Fluid Grid** model optimized for mobile-first interactions. A base 8px rhythm governs all vertical and horizontal spacing to ensure a consistent visual cadence.

- **Mobile Layout**: Utilizes a 4-column grid with 20px outer margins to provide "breathing room" and prevent accidental edge-taps.
- **Content Stacking**: Information clusters use 8px spacing, while distinct sections are separated by 24px increments to create clear visual hierarchy.
- **Safe Areas**: All interactive elements maintain a minimum height of 48px to accommodate diverse motor skills and environmental distractions (e.g., gloved hands or moisture on screen).

## Elevation & Depth

To simulate the depth of natural layers, the design system uses **Tonal Layers** combined with **Ambient Shadows**.

1.  **Level 0 (Base)**: The Soft Off-white background.
2.  **Level 1 (Cards/Surface)**: White surfaces with a very soft, diffused shadow (0px 4px 20px, 5% opacity black tinted with Earthy Brown). This creates a gentle lift that feels organic rather than artificial.
3.  **Level 2 (Active/Floating)**: Used for floating action buttons or active alerts. These feature a slightly more pronounced shadow with 10% opacity to denote immediate priority.

Avoid heavy black shadows; instead, use shadows with a subtle brown or green tint to maintain the nature-inspired aesthetic.

## Shapes

The shape language is characterized by **high-radius curves**, reflecting the organic lines found in nature. 

A base roundedness of **16px (1rem)** is applied to primary UI containers and cards to create a friendly, approachable character. Buttons use a fully rounded "pill" shape to maximize their affordance as touch-ready elements. This softness is balanced by the clean, geometric structure of the 8px grid, ensuring the app feels like a professional tool rather than a toy.

## Components

### Buttons
- **Primary**: Pill-shaped, Solid Leaf Green background with White text. Used for "Start Harvest" or "Analyze Soil."
- **Secondary**: Pill-shaped, Earthy Brown outline with 2px stroke. Used for "Save Draft" or "View History."
- **Ghost**: No background, Leaf Green text for low-priority actions like "Learn More."

### Cards
Cards are the primary container for data. They feature a white background, 16px corner radius, and a Level 1 elevation. For AI-driven insights, use a 1px inner border in Golden Wheat to signify "Premium/AI" content.

### Inputs & Selection
- **Text Fields**: Soft-white fill with a bottom-only 2px Earthy Brown border. Labels are always visible above the field.
- **Checkboxes/Radios**: Circular (16px) with a Leaf Green fill when active.
- **Chips**: Small, 8px rounded capsules used for filtering crop types or system statuses (e.g., "Active," "Irrigating").

### Bottom Navigation
The navigation bar is a Level 2 surface with clear 24px icons. Every icon must be accompanied by a label in `label-sm` typography to ensure there is no ambiguity in navigation for first-time users.

### Status Banners
Environmental alerts (weather/pest) appear at the top of the viewport. They use Solid Warning Orange or Alert Red with white text and a leading icon to ensure immediate recognition.