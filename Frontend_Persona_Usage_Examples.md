# Using SuperClaude Frontend Persona with Cline - Practical Examples

## How to Prompt the Frontend Persona in Cline

When using Cline, you can activate the SuperClaude Frontend persona in several ways:

### Method 1: Automatic Activation (Easiest)
Just mention frontend-related keywords and the persona will auto-activate:

```
Improve the UI components in my parenting app
```

```
Make the chat interface more accessible
```

```
Optimize the performance of my React components
```

### Method 2: Manual Activation (Explicit Control)
Use the `--persona-frontend` flag with SuperClaude commands:

```
/sc:analyze parenting_app/app/index.tsx --persona-frontend
```

```
/sc:improve parenting_app/app/ --persona-frontend --focus accessibility
```

```
/sc:build parenting_app/app/components/ --persona-frontend
```

## Practical Examples for Your Parenting App

Based on your iOS parenting app, here are specific prompts you can use in Cline:

### 1. Component Analysis and Improvement
```
/sc:analyze parenting_app/app/index.tsx --persona-frontend

Analyze this chat screen component for UI/UX improvements, accessibility issues, and performance optimizations.
```

### 2. Accessibility Review
```
/sc:improve parenting_app/app/resources.tsx --persona-frontend --focus accessibility

Review this resources screen for WCAG 2.1 AA compliance and suggest accessibility improvements.
```

### 3. Performance Optimization
```
/sc:analyze parenting_app/app/ --persona-frontend --focus performance

Check all components for performance issues, bundle size optimization, and mobile performance.
```

### 4. Responsive Design Review
```
/sc:improve parenting_app/app/settings.tsx --persona-frontend

Make this settings screen more responsive and improve the mobile user experience.
```

### 5. Design System Consistency
```
/sc:analyze parenting_app/app/ --persona-frontend --focus design

Review all components for design consistency, color usage, typography, and spacing patterns.
```

## Natural Language Prompts (No Commands)

You can also use natural language that will auto-activate the frontend persona:

### UI/UX Improvements
```
The chat interface in my parenting app feels cluttered. Can you help me improve the user experience and make it more intuitive for new parents?
```

### Accessibility Focus
```
I need to make my parenting app more accessible for parents with disabilities. Can you review my components and suggest improvements?
```

### Mobile Optimization
```
My React Native app needs better mobile performance. The chat screen is slow on older devices. Help me optimize it.
```

### Component Architecture
```
I want to refactor my parenting app components to be more reusable and maintainable. Can you help restructure them?
```

## Advanced Frontend Persona Usage

### Combining with Other Flags
```
/sc:improve parenting_app/app/index.tsx --persona-frontend --focus performance --benchmark

Optimize this chat component for performance and provide before/after metrics.
```

### Multiple Perspective Analysis
```
/sc:analyze parenting_app/app/settings.tsx --persona-frontend
/sc:analyze parenting_app/app/settings.tsx --persona-security

Get both frontend UX perspective and security review of the same component.
```

### Documentation Generation
```
/sc:document parenting_app/app/components/ --persona-frontend --type guide

Create user-focused documentation for these UI components.
```

## What the Frontend Persona Will Focus On

When activated, the frontend persona prioritizes:

1. **User Experience**: Intuitive interfaces for stressed parents
2. **Accessibility**: WCAG 2.1 AA compliance for all users
3. **Performance**: Fast loading on mobile/3G connections
4. **Responsive Design**: Works well on all device sizes
5. **Visual Design**: Consistent, calming design for parenting context

## Expected Responses

The frontend persona will provide:

- **Specific UI improvements** with code examples
- **Accessibility audit results** with WCAG guidelines
- **Performance recommendations** with metrics
- **Design system suggestions** for consistency
- **Mobile-first optimization** strategies

## Tips for Better Results

### Be Specific About Context
```
❌ "Improve my app"
✅ "Improve the chat interface for tired parents using the app at 3am"
```

### Mention Your Users
```
❌ "Make it accessible"
✅ "Make it accessible for new parents who might be using screen readers or have limited mobility"
```

### Include Performance Context
```
❌ "Make it faster"
✅ "Optimize for parents using older phones on slow mobile connections"
```

### Specify the Component
```
❌ "Fix the UI"
✅ "Improve the resources tab navigation and make the milestone tracker more intuitive"
```

## Sample Conversation Flow

Here's how a typical conversation might go:

**You:**
```
/sc:improve parenting_app/app/index.tsx --persona-frontend

This is the main chat screen of my parenting app. New parents use this to ask questions about feeding, sleep, etc. Can you make it more user-friendly?
```

**Frontend Persona Response:**
- Analyzes the chat interface design
- Suggests UX improvements for stressed parents
- Recommends accessibility enhancements
- Provides performance optimizations
- Offers code examples for improvements

**Follow-up:**
```
Can you also check if the color scheme is appropriate for use during nighttime feeding sessions?
```

**Frontend Persona Response:**
- Evaluates color contrast for low-light usage
- Suggests dark mode implementation
- Recommends eye-strain reduction techniques

## Quick Reference Commands

| Goal | Command |
|------|---------|
| General UI review | `/sc:analyze [file] --persona-frontend` |
| Accessibility audit | `/sc:improve [file] --persona-frontend --focus accessibility` |
| Performance optimization | `/sc:analyze [file] --persona-frontend --focus performance` |
| Responsive design | `/sc:improve [file] --persona-frontend --focus responsive` |
| Component refactoring | `/sc:improve [file] --persona-frontend --focus maintainability` |

Remember: The frontend persona understands your parenting app context and will tailor suggestions specifically for your target users (new parents) and use cases (late-night usage, stress, mobile-first, etc.).
