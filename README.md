LIVE DEMO: [ https://hollow-purple-bedv.vercel.app/ ]

# Mini RL Environment

A lightweight React-based reinforcement learning testing environment for AI agents. This project provides an interactive platform to test and evaluate AI/LLM responses across multiple task categories with automated grading.

## 🚀 Features

- **Multi-Task Testing**: Pre-configured tasks across different categories:
  - Summarization
  - Code Generation
  - Reasoning
  - Safety Filter
  
- **Automated Grading System**:
  - Programmatic constraint checking (word limits, required/forbidden terms)
  - Semantic similarity scoring against ideal responses
  - Detailed feedback with weighted criteria
  
- **Interactive UI**: Clean, modern interface built with React and Vite
- **Real-time Evaluation**: Instant feedback on AI agent responses

## 📋 Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

## 🛠️ Installation

1. Clone or download this repository

2. Install dependencies:
```bash
npm install
```

## 🎯 Usage

### Development Mode

Start the development server:

```bash
npm run dev
```

The application will open in your browser at `http://localhost:5173` (or the next available port).

### Production Build

Build the application for production:

```bash
npm run build
```

### Preview Production Build

Preview the production build locally:

```bash
npm run preview
```

## 📁 Project Structure

```
mini-rl-environment/
├── index.html              # HTML entry point
├── package.json            # Project dependencies and scripts
├── vite.config.js          # Vite configuration
├── mini-rl-environment.jsx # Main RL environment component with grading logic
├── src/
│   ├── App.jsx             # Root React component
│   ├── main.jsx            # Application entry point
│   └── index.css           # Global styles
└── README.md               # This file
```

## 🧪 Task Configuration

Tasks are defined in `mini-rl-environment.jsx` with the following structure:

```javascript
{
  id: "unique_id",
  name: "Task Name",
  prompt: "The prompt shown to the AI agent",
  ideal: "Ideal/reference response",
  constraints: {
    maxWords: 20,                    // Maximum word count
    mustInclude: ["keyword1"],       // Required terms
    forbid: ["unwanted_term"]        // Forbidden terms
  }
}
```

### Grading System

The environment uses a two-tier grading approach:

1. **Constraint Checking**: Validates response against defined constraints
   - Word limit compliance
   - Required keyword presence
   - Forbidden term absence
   - Non-empty response verification

2. **Semantic Similarity**: Compares response to ideal answer
   - Word overlap analysis
   - Length ratio consideration
   - Weighted scoring (70% similarity, 30% length)

## 🔧 Customization

### Adding New Tasks

Edit the `TASKS` array in `mini-rl-environment.jsx`:

```javascript
{
  id: "t5",
  name: "Your Task Name",
  prompt: "Your prompt here",
  ideal: "Expected response",
  constraints: {
    maxWords: 50,
    mustInclude: ["required", "terms"],
    forbid: ["unwanted", "words"]
  }
}
```

### Modifying Grading Weights

Adjust the weights in the `gradeConstraints` function to customize evaluation criteria:
- Word limit: `0.2`
- Must-include terms: `0.25 / count`
- Forbidden terms: `0.15 / count`
- Non-empty check: `0.1`

## 🧰 Tech Stack

- **React** (v18.2.0) - UI framework
- **Vite** (v5.0.8) - Build tool and dev server
- **JavaScript (ES6+)** - Programming language

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

## 🎨 UI Components

The main `MiniRLEnvironment` component provides:
- Task selection interface
- Response input area
- Real-time grading display
- Performance metrics visualization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is private and proprietary.

## 👨‍💻 Development Tips

- Use React DevTools for component debugging
- Modify tasks in `mini-rl-environment.jsx` for custom testing scenarios
- Check browser console for detailed grading logs
- Hot module replacement is enabled for instant updates during development

## 🐛 Troubleshooting

**Port already in use:**
```bash
# Vite will automatically find the next available port
# Or specify a custom port in vite.config.js
```

**Dependencies not installing:**
```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## 📞 Support

For issues or questions, please check the code comments in `mini-rl-environment.jsx` for detailed implementation notes.

---

**Built with ❤️ using React and Vite**

**🍅 THIS IS JUST A PROTOTYPE IDEA FOR A MAIN PROJECT 🍅**
