# SuperClaude Framework Setup Guide for Claude on Amazon Bedrock with Cline

## Overview

This guide will help you set up the SuperClaude Framework personas (System Architect, Frontend Developer, Security Engineer, and Scribe) for use with Claude on Amazon Bedrock through Cline. SuperClaude enhances Claude Code with specialized commands, cognitive personas, and development methodologies.

## What is SuperClaude?

SuperClaude is a framework that extends Claude Code with:
- 🛠️ **16 specialized commands** for common development tasks
- 🎭 **Smart personas** that automatically activate based on context
- 🔧 **MCP server integration** for enhanced capabilities
- 📋 **Task management** and progress tracking
- ⚡ **Token optimization** for longer conversations

## Prerequisites

- Python 3.7+ installed on your system
- Claude Code access through Amazon Bedrock
- Cline extension installed in VS Code
- Basic familiarity with command-line operations

## Installation Steps

### Step 1: Install SuperClaude Package

Choose one of the following installation methods:

#### Option A: Using pip (Standard)
```bash
pip install SuperClaude
```

#### Option B: Using uv (Recommended - Faster)
```bash
# Install uv first if not already installed
curl -Ls https://astral.sh/uv/install.sh | sh

# Then install SuperClaude
uv add SuperClaude
```

#### Option C: From Source
```bash
git clone https://github.com/SuperClaude-Org/SuperClaude_Framework.git
cd SuperClaude_Framework
uv sync
```

### Step 2: Run the SuperClaude Installer

After installing the package, run the installer to configure Claude Code integration:

#### Quick Setup (Recommended)
```bash
python3 -m SuperClaude install
```

#### Interactive Setup (Choose Components)
```bash
python3 -m SuperClaude install --interactive
```

#### Developer Setup (Everything Included)
```bash
python3 -m SuperClaude install --profile developer
```

#### Alternative Command Formats
```bash
# Using SuperClaude directly
SuperClaude install

# Using python module
python3 SuperClaude install
```

## Understanding the Personas

SuperClaude personas are AI specialists that automatically activate based on context. Here are the four personas you mentioned:

### 🏗️ System Architect (`architect`)

**What they do**: Long-term architecture planning, system design, scalability decisions

**Auto-activates on**:
- Keywords: "architecture", "design", "scalability", "system structure"
- Complex system modifications involving multiple modules
- Planning large features or system changes

**Great for**:
- Planning new systems or major features
- Architectural reviews and improvements
- Technical debt assessment
- Design pattern recommendations
- Scalability planning

**Example usage**:
```bash
/sc:design microservices-migration --persona-architect
/sc:analyze --focus architecture large-system/
/sc:estimate "redesign auth system" --persona-architect
```

### 🎨 Frontend Developer (`frontend`)

**What they do**: User experience, accessibility, frontend performance, design systems

**Auto-activates on**:
- Keywords: "component", "responsive", "accessibility", "UI", "UX"
- Frontend development work
- User interface related tasks

**Great for**:
- Building UI components
- Accessibility compliance (WCAG 2.1 AA)
- Frontend performance optimization
- Design system work
- User experience improvements

**Example usage**:
```bash
/sc:build dashboard --persona-frontend
/sc:improve --focus accessibility components/
/sc:analyze --persona-frontend --focus performance
```

### 🛡️ Security Engineer (`security`)

**What they do**: Security analysis, threat modeling, vulnerability assessment, compliance

**Auto-activates on**:
- Keywords: "security", "vulnerability", "auth", "compliance"
- Security scanning or assessment work
- Authentication/authorization tasks

**Great for**:
- Security audits and vulnerability scanning
- Threat modeling and risk assessment
- Secure coding practices
- Compliance requirements (OWASP, etc.)
- Authentication and authorization systems

**Example usage**:
```bash
/sc:scan --persona-security --focus security
/sc:analyze auth-system/ --persona-security
/sc:improve --focus security --persona-security
```

### ✍️ Scribe (`scribe`)

**What they do**: Professional writing, documentation, localization, cultural communication

**Auto-activates on**:
- Keywords: "document", "write", "guide", "README"
- Documentation or writing tasks
- Professional communication needs

**Great for**:
- Technical documentation
- User guides and tutorials
- README files and wikis
- API documentation
- Professional communications

**Example usage**:
```bash
/sc:document api/ --persona-scribe
/sc:git commit --persona-scribe
/sc:explain --persona-scribe complex-feature
```

## How to Use Personas with Cline

### Automatic Activation (Recommended)

The easiest way to use SuperClaude is to let personas activate automatically:

```bash
# These automatically activate the right experts:
/sc:analyze payment-system/         # → Security + backend experts auto-activate
/sc:build react-app/               # → Frontend specialist takes over  
/sc:improve slow-queries.sql       # → Performance optimizer jumps in
/sc:troubleshoot "auth failing"    # → Debug specialist + security expert coordinate
```

### Manual Persona Selection

When you want a specific perspective:

```bash
# Force specific persona
/sc:analyze frontend-code/ --persona-security  # Security view of frontend
/sc:improve backend-api/ --persona-architect   # Architectural view of backend

# Multiple perspectives on same code
/sc:analyze auth.js --persona-security
/sc:analyze auth.js --persona-frontend
/sc:analyze auth.js --persona-architect
```

## Integration with Amazon Bedrock and Cline

### Configuration Files

After installation, SuperClaude creates configuration files in `~/.claude/`:

- `~/.claude/settings.json` - Main configuration
- `~/.claude/*.md` - Framework behavior files

### Using with Cline

1. **Open VS Code** with Cline extension installed
2. **Start a new chat** with Claude through Cline
3. **Use SuperClaude commands** directly in the chat:

```bash
# Analyze your iOS app with architectural perspective
/sc:analyze parenting_app/ --persona-architect

# Get security review of your authentication code
/sc:analyze parenting_app/app/settings.tsx --persona-security

# Improve frontend components with accessibility focus
/sc:improve parenting_app/app/index.tsx --persona-frontend

# Document your API endpoints
/sc:document parenting_app/app/ --persona-scribe
```

## Available Commands

SuperClaude provides 16 specialized commands:

### Development Commands
- `/sc:implement` - Feature and code implementation
- `/sc:build` - Compilation and packaging
- `/sc:design` - System and UI design

### Analysis Commands
- `/sc:analyze` - Code and system analysis
- `/sc:troubleshoot` - Debugging and problem solving
- `/sc:explain` - Detailed explanations

### Quality Commands
- `/sc:improve` - Code and system improvements
- `/sc:test` - Testing and validation
- `/sc:cleanup` - Code cleanup and refactoring

### Utility Commands
- `/sc:document` - Documentation generation
- `/sc:git` - Git operations and commit messages
- `/sc:estimate` - Time and effort estimation
- `/sc:task` - Task management
- `/sc:index` - Code indexing
- `/sc:load` - Load and analyze codebases
- `/sc:spawn` - Create new components/files

## Best Practices

### 1. Start Simple
- Use basic commands without persona flags initially
- Let auto-activation handle persona selection
- Override only when you need a different perspective

### 2. Leverage Auto-Activation
```bash
# Good - let SuperClaude choose the right expert
/sc:analyze security-module/

# Also good - when you want a specific perspective
/sc:analyze security-module/ --persona-frontend
```

### 3. Combine Personas for Complex Tasks
```bash
# Sequential analysis with different perspectives
/sc:analyze --persona-security api/auth.js
/sc:analyze --persona-performance api/auth.js  
/sc:analyze --persona-architect api/auth.js
```

### 4. Use Appropriate Flags
```bash
# Security-focused analysis with validation
/sc:analyze --persona-security --focus security --validate

# Performance optimization with benchmarking
/sc:improve --persona-performance --focus performance --benchmark

# Educational explanation with full detail
/sc:explain complex-concept --persona-scribe --verbose
```

## Troubleshooting

### Common Issues

**"Wrong persona activated"**
- Use explicit persona flags: `--persona-security`
- Check if your keywords triggered auto-activation
- Try more specific language in your request

**"Persona doesn't seem to work"**
- Verify persona name spelling: `--persona-frontend` not `--persona-fronted`
- Some personas work better with specific commands
- Try combining with relevant flags: `--focus security --persona-security`

**"Installation failed"**
- Ensure Python 3.7+ is installed
- Try using `uv` instead of `pip`
- Check permissions for writing to `~/.claude/`

### Getting Help

```bash
# See all available options
SuperClaude install --help

# Check installation status
SuperClaude status

# Update components
SuperClaude update
```

## Example Workflows for Your iOS App

Based on your parenting app project, here are some practical examples:

### 1. Architectural Review
```bash
/sc:analyze parenting_app/ --persona-architect --focus architecture
```

### 2. Security Assessment
```bash
/sc:analyze parenting_app/app/settings.tsx --persona-security --focus security
```

### 3. Frontend Optimization
```bash
/sc:improve parenting_app/app/index.tsx --persona-frontend --focus performance
```

### 4. Documentation Generation
```bash
/sc:document parenting_app/ --persona-scribe --type guide
```

### 5. Code Quality Improvement
```bash
/sc:improve parenting_app/app/ --focus quality
```

## Advanced Features

### MCP Server Integration

SuperClaude can integrate with MCP servers for enhanced capabilities:

- **Context7** - Official library docs and patterns
- **Sequential** - Complex multi-step thinking
- **Magic** - Modern UI component generation
- **Playwright** - Browser automation and testing

### Task Management

```bash
# Create and manage development tasks
/sc:task create "Implement user authentication"
/sc:task list
/sc:task complete "Setup project structure"
```

### Git Integration

```bash
# Generate professional commit messages
/sc:git commit --persona-scribe

# Analyze git history
/sc:git analyze --persona-architect
```

## Next Steps

1. **Install SuperClaude** using one of the methods above
2. **Run the installer** to configure Claude Code integration
3. **Start with simple commands** in Cline
4. **Experiment with personas** as you become comfortable
5. **Explore advanced features** like MCP integration

## Resources

- [SuperClaude GitHub Repository](https://github.com/SuperClaude-Org/SuperClaude_Framework)
- [Complete User Guide](https://github.com/SuperClaude-Org/SuperClaude_Framework/blob/master/Docs/superclaude-user-guide.md)
- [Commands Guide](https://github.com/SuperClaude-Org/SuperClaude_Framework/blob/master/Docs/commands-guide.md)
- [Personas Guide](https://github.com/SuperClaude-Org/SuperClaude_Framework/blob/master/Docs/personas-guide.md)

## Support

If you encounter issues:
1. Check the [GitHub Issues](https://github.com/SuperClaude-Org/SuperClaude_Framework/issues)
2. Review the troubleshooting section above
3. Create a new issue with detailed information about your setup

---

*This guide should get you started with SuperClaude personas in your Claude on Amazon Bedrock + Cline setup. The framework is designed to be simple to use while providing powerful capabilities when you need them.*
