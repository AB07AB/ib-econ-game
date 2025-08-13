/*
 * main.js
 *
 * Entry point for the IB Economics SL revision game.
 * The game uses Phaser 3 to manage scenes and basic game logic.
 * Questions are loaded from a JSON file. User input is gathered via
 * simple HTML elements overlaid on the game canvas. At the end of a
 * session, a summary of performance is presented.
 */

// The dimensions of the Phaser game. These can be adjusted to suit
// different screen sizes; Phaser will automatically scale.
const GAME_WIDTH = 900;
const GAME_HEIGHT = 600;

// Global storage for question data. This is filled in BootScene by
// fetching the external JSON file. Each property (diagram, calculation,
// essay, case, flash) contains an array of questions.
let QUESTIONS = {};

// Global storage for the current session results. This object
// accumulates user answers, timings and scores. It is reset when a new
// session starts and passed to the summary scene.
let Session = {
  mode: null,
  level: 1,
  startTime: 0,
  endTime: 0,
  questions: [],
  answers: [],
  correct: [],
  times: [],
  keywordsFound: []
};

// Utility: shuffle an array (Fisher–Yates). Used to randomize question order.
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// BootScene – loads question data and transitions to the MenuScene. A
// simple loading animation could be added here if desired.
class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }
  preload() {
    // This scene does not perform asynchronous loading. All question data
    // is embedded in data/questions.js as the global variable
    // window.QUESTION_DATA. Additional assets could be loaded here.
  }
  create() {
    // Assign the embedded QUESTION_DATA to the global QUESTIONS object.
    if (typeof window.QUESTION_DATA === 'undefined') {
      console.error('QUESTION_DATA is not defined. Ensure that data/questions.js is loaded in index.html.');
      this.add.text(50, 50, 'Error loading questions data', { fontSize: '20px', fill: '#ff0000' });
      return;
    }
    QUESTIONS = window.QUESTION_DATA;
    // Proceed to menu
    this.scene.start('MenuScene');
  }
}

// MenuScene – displays mode options and level selection. When a mode is
// chosen, the corresponding scene is started with the selected level.
class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }
  create() {
    const scene = this;
    this.add.text(GAME_WIDTH / 2, 60, 'IB Economics SL Revision Game', { fontSize: '32px', color: '#1e3a8a' }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 100, 'Select a mode and difficulty level', { fontSize: '18px', color: '#333' }).setOrigin(0.5);

    // Mode buttons
    const modes = [
      { key: 'diagram', label: 'Diagram Mode' },
      { key: 'calculation', label: 'Calculation Mode' },
      { key: 'essay', label: 'Essay Mode' },
      { key: 'case', label: 'Case Study Mode' },
      { key: 'flash', label: 'Flashcard Mode' }
    ];

    const startY = 150;
    modes.forEach((mode, idx) => {
      const y = startY + idx * 50;
      const button = this.add.text(GAME_WIDTH / 2, y, mode.label, { fontSize: '20px', backgroundColor: '#1976d2', color: '#ffffff', padding: 10 })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => button.setBackgroundColor('#145a9e'))
        .on('pointerout', () => button.setBackgroundColor('#1976d2'))
        .on('pointerdown', () => this.showLevelSelection(mode.key));
    });

    // Info about existing progress (stored in localStorage). This
    // encourages replay by reminding players of their level. Only show if
    // progress exists.
    const progress = localStorage.getItem('ib_econ_progress');
    if (progress) {
      const info = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 40, 'Saved progress found. Your previous best results will be used for adaptive difficulty.', { fontSize: '14px', color: '#555' }).setOrigin(0.5);
    }
  }
  // Display a simple overlay for level selection. Once a level is
  // selected, start the appropriate scene.
  showLevelSelection(modeKey) {
    const scene = this;
    // Remove existing level overlay if present
    if (this.levelOverlay) {
      this.levelOverlay.destroy();
    }
    const overlay = this.add.container(0, 0);
    this.levelOverlay = overlay;
    const bg = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.5).setOrigin(0);
    overlay.add(bg);
    const panelWidth = 400;
    const panelHeight = 250;
    const panelX = (GAME_WIDTH - panelWidth) / 2;
    const panelY = (GAME_HEIGHT - panelHeight) / 2;
    const panel = this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0xffffff).setOrigin(0);
    overlay.add(panel);
    const title = this.add.text(panelX + panelWidth / 2, panelY + 40, 'Select Difficulty Level', { fontSize: '22px', color: '#1e3a8a' }).setOrigin(0.5);
    overlay.add(title);
    const levels = [1, 2, 3];
    levels.forEach((lvl, idx) => {
      const btn = this.add.text(panelX + panelWidth / 2, panelY + 90 + idx * 40, 'Level ' + lvl, { fontSize: '20px', backgroundColor: '#1976d2', color: '#ffffff', padding: 8 })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => btn.setBackgroundColor('#145a9e'))
        .on('pointerout', () => btn.setBackgroundColor('#1976d2'))
        .on('pointerdown', () => {
          // Start session
          Session = {
            mode: modeKey,
            level: lvl,
            startTime: Date.now(),
            endTime: 0,
            questions: [],
            answers: [],
            correct: [],
            times: [],
            keywordsFound: []
          };
          overlay.destroy();
          // Determine which scene to start based on modeKey
          // Start the appropriate scene based on the mode key.  Each
          // question scene's constructor explicitly sets its own key
          // (e.g. 'diagram', 'calculation', etc.).  Using these
          // lowercase keys here avoids mismatches that previously
          // prevented the scenes from loading and resulted in blank
          // screens when selecting a level.
          switch (modeKey) {
            case 'diagram':
              scene.scene.start('diagram');
              break;
            case 'calculation':
              scene.scene.start('calculation');
              break;
            case 'essay':
              scene.scene.start('essay');
              break;
            case 'case':
              scene.scene.start('case');
              break;
            case 'flash':
              scene.scene.start('flash');
              break;
            default:
              // Fallback to summary if unknown key
              scene.scene.start('SummaryScene');
              break;
          }
        });
      overlay.add(btn);
    });
    // Cancel button
    const cancelBtn = this.add.text(panelX + panelWidth / 2, panelY + panelHeight - 30, 'Cancel', { fontSize: '18px', color: '#1976d2' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => overlay.destroy());
    overlay.add(cancelBtn);
  }
}

// Base class for question scenes. Subclasses can override the
// createQuestionUI and handleSubmit methods. This class manages the
// sequence of questions, timing and navigation. It assumes that
// Session.mode and Session.level are set by MenuScene.
class QuestionScene extends Phaser.Scene {
  constructor(key) {
    super(key);
    this.modeKey = key;
    this.currentIndex = 0;
    // Initialize an array to keep track of Phaser text objects for each question. These
    // objects will be destroyed when moving to the next question to prevent stacking.
    this.textObjects = [];
  }
  create() {
    // Filter questions by mode and level. Default to all questions if
    // none match the level (useful for demonstration). The slice() call
    // makes a copy to avoid mutating the original array.
    const allQuestions = QUESTIONS[this.modeKey] || [];
    const filtered = allQuestions.filter(q => q.level === Session.level || q.level < Session.level);
    // Fallback: if no questions match at the selected level, use all
    // questions. This prevents the game from crashing and allows testing
    // with incomplete data sets.
    this.questions = filtered.length > 0 ? shuffleArray(filtered.slice()) : shuffleArray(allQuestions.slice());
    Session.questions = this.questions;
    // Title and instructions
    this.add.text(GAME_WIDTH / 2, 40, this.getTitle(), { fontSize: '26px', color: '#1e3a8a' }).setOrigin(0.5);

    // Create a progress bar and text to show question progress.  The bar
    // will be updated on each question.  We avoid destroying it when
    // cleaning up individual questions.
    const totalQuestions = this.questions ? this.questions.length : 1;
    const barX = 50;
    const barY = 70;
    const barWidth = GAME_WIDTH - 100;
    const barHeight = 15;
    // Background rectangle for the progress bar
    this.progressBarBg = this.add.rectangle(barX, barY, barWidth, barHeight, 0xdfe6f0).setOrigin(0, 0.5);
    // Fill rectangle that will be scaled according to progress
    this.progressBarFill = this.add.rectangle(barX, barY, 0, barHeight, 0x1976d2).setOrigin(0, 0.5);
    // Text showing current question out of total
    this.progressText = this.add.text(barX + barWidth, barY, '', { fontSize: '14px', color: '#333' }).setOrigin(1, 0.5);
    // Add a persistent back button in the top‑left corner for all question scenes. When clicked
    // it returns immediately to the main menu. We do not include this button in the textObjects
    // array so it persists across questions and is not destroyed by cleanup().
    if (!this.backButton) {
      this.backButton = this.add.text(20, 10, 'Back to Menu', {
        fontSize: '18px',
        backgroundColor: '#1976d2',
        color: '#ffffff',
        padding: { left: 8, right: 8, top: 4, bottom: 4 }
      }).setInteractive({ useHandCursor: true })
        .on('pointerover', () => this.backButton.setBackgroundColor('#145a9e'))
        .on('pointerout', () => this.backButton.setBackgroundColor('#1976d2'))
        .on('pointerdown', () => {
          // Immediately return to menu
          this.scene.start('MenuScene');
        });
    }
    // Create the first question UI
    this.currentIndex = 0;
    this.createQuestionUI(this.questions[this.currentIndex]);
  }

  // Update the progress bar based on the current index and total questions.
  updateProgressBar() {
    const total = this.questions.length;
    // Avoid division by zero
    const ratio = total > 0 ? (this.currentIndex) / total : 0;
    const barWidth = GAME_WIDTH - 100;
    if (this.progressBarFill) {
      this.progressBarFill.width = barWidth * ratio;
    }
    if (this.progressText) {
      // Display current question number (1‑based) and total
      const currentNumber = Math.min(this.currentIndex + 1, total);
      this.progressText.setText(`${currentNumber}/${total}`);
    }
  }
  // Derived scenes must implement this to display a question and
  // collect user input. It should call this.handleSubmit() when the
  // player finishes answering.
  createQuestionUI(question) {}
  // Derived scenes should implement evaluation logic for a given
  // question and userAnswer. It should return an object with fields
  // { correct: boolean, info: any }. The default implementation
  // returns false for all answers.
  evaluateAnswer(question, userAnswer) {
    return { correct: false, info: null };
  }
  // Remove any existing UI elements (for example, DOM elements) before
  // drawing a new question. Subclasses may override if they add
  // additional cleanup.
  cleanup() {
    if (this.domContainer) {
      this.domContainer.destroy();
      this.domContainer = null;
    }
    // Destroy any Phaser text objects created for the previous question
    if (this.textObjects && this.textObjects.length > 0) {
      this.textObjects.forEach(obj => {
        if (obj && obj.destroy) obj.destroy();
      });
      this.textObjects = [];
    }
  }
  // Called when the user submits an answer. It stores the answer,
  // evaluation result and timing. If more questions remain, it moves to
  // the next question; otherwise it finishes the session.
  handleSubmit(userAnswer) {
    const question = this.questions[this.currentIndex];
    // Evaluate answer
    const result = this.evaluateAnswer(question, userAnswer);
    Session.answers.push(userAnswer);
    Session.correct.push(result.correct);
    Session.keywordsFound.push(result.keywordsFound || []);
    // Record time spent on this question
    const now = Date.now();
    const elapsed = now - (Session.lastTimestamp || Session.startTime);
    Session.times.push(elapsed);
    Session.lastTimestamp = now;
    // Move to next question or finish
    this.currentIndex++;
    if (this.currentIndex < this.questions.length) {
      this.cleanup();
      this.createQuestionUI(this.questions[this.currentIndex]);
    } else {
      Session.endTime = Date.now();
      // Save progress for adaptive difficulty
      localStorage.setItem('ib_econ_progress', JSON.stringify({ mode: Session.mode, level: Session.level, correct: Session.correct }));
      this.scene.start('SummaryScene');
    }
  }
  // Helper to return a title based on mode. Subclasses may override.
  getTitle() {
    switch (this.modeKey) {
      case 'diagram': return 'Diagram Mode';
      case 'calculation': return 'Calculation Mode';
      case 'essay': return 'Essay Mode';
      case 'case': return 'Case Study Mode';
      case 'flash': return 'Flashcard Mode';
      default: return 'Question Mode';
    }
  }
}

// DiagramScene – player reads a scenario, draws a diagram on paper (optional),
// writes an explanation and then views the correct diagram and solution.
class DiagramScene extends QuestionScene {
  constructor() {
    super('diagram');
  }
  createQuestionUI(question) {
    // Update progress bar for this question
    this.updateProgressBar();
    // Reset text objects array for this question
    this.textObjects = [];
    const yStart = 100;
    // Show context
    const contextText = this.add.text(50, yStart, 'Context: ' + question.context, {
      fontSize: '18px',
      color: '#000000',
      wordWrap: { width: GAME_WIDTH - 100 }
    });
    this.textObjects.push(contextText);
    // Prompt
    const promptY = contextText.y + contextText.height + 10;
    const promptText = this.add.text(50, promptY, 'Task: ' + question.prompt, {
      fontSize: '18px',
      color: '#000000',
      wordWrap: { width: GAME_WIDTH - 100 }
    });
    this.textObjects.push(promptText);
    // Create a DOM container for input, feedback and solution.  To avoid the "Show Solution"
    // bug, limit the height of the solution area and enable scrolling so the next button
    // remains visible.  The container itself can scroll if the content grows.
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.marginTop = '10px';
    container.style.maxHeight = '280px';
    container.style.overflowY = 'auto';
    // Input area for explanation
    const textarea = document.createElement('textarea');
    textarea.className = 'ui-textarea';
    textarea.placeholder = 'Write your explanation here...';
    container.appendChild(textarea);
    // Feedback paragraph – shows correct/incorrect after answer submission
    const feedback = document.createElement('p');
    feedback.style.display = 'none';
    feedback.style.fontWeight = 'bold';
    feedback.style.marginTop = '5px';
    container.appendChild(feedback);
    // Button to reveal solution. When clicked, show expected diagram and explanation.
    const revealBtn = document.createElement('button');
    revealBtn.className = 'ui-button';
    revealBtn.textContent = 'Show Solution';
    container.appendChild(revealBtn);
    // Solution output area – hidden until reveal. Limit its height to keep next button visible.
    const solutionDiv = document.createElement('div');
    solutionDiv.style.marginTop = '10px';
    solutionDiv.style.padding = '10px';
    solutionDiv.style.border = '1px solid #ccc';
    solutionDiv.style.display = 'none';
    solutionDiv.style.maxHeight = '180px';
    solutionDiv.style.overflowY = 'auto';
    container.appendChild(solutionDiv);
    // Next button (placed outside solution area to stay visible)
    const nextBtn = document.createElement('button');
    nextBtn.className = 'ui-button';
    nextBtn.textContent = this.currentIndex === this.questions.length - 1 ? 'Finish Session' : 'Next Question';
    container.appendChild(nextBtn);
    // Event handlers
    revealBtn.addEventListener('click', () => {
      // Show expected diagram and explanation
      solutionDiv.style.display = 'block';
      // Clear any existing content
      solutionDiv.innerHTML = '';
      // Insert explanation text
      const p = document.createElement('p');
      p.textContent = 'Expected Diagram: ' + question.expectedDiagram;
      solutionDiv.appendChild(p);
      const exp = document.createElement('p');
      exp.textContent = 'Explanation: ' + question.solutionExplanation;
      solutionDiv.appendChild(exp);
      // Draw a simple placeholder diagram using Chart.js
      const canvas = document.createElement('canvas');
      canvas.width = 360;
      canvas.height = 250;
      solutionDiv.appendChild(canvas);
      const ctx = canvas.getContext('2d');
      const data = {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [
          {
            label: 'Initial Curve',
            data: [3, 2.5, 2, 1.8],
            borderColor: 'rgba(100, 181, 246, 1)',
            backgroundColor: 'rgba(100, 181, 246, 0.2)',
            fill: false
          },
          {
            label: 'Shifted Curve',
            data: [4.5, 3.5, 3, 2.8],
            borderColor: 'rgba(220, 20, 60, 1)',
            backgroundColor: 'rgba(220, 20, 60, 0.2)',
            fill: false
          }
        ]
      };
      new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
          plugins: { legend: { display: true } },
          scales: {
            x: { title: { display: true, text: 'Quantity' } },
            y: { title: { display: true, text: 'Price' } }
          }
        }
      });
    });
    nextBtn.addEventListener('click', () => {
      const answer = textarea.value.trim();
      // Evaluate the answer before submitting
      const result = this.evaluateAnswer(question, answer);
      // Show feedback
      feedback.style.display = 'block';
      if (result.correct) {
        feedback.textContent = 'Correct!';
        feedback.style.color = '#008000';
      } else {
        // Show which keywords were missing for diagrams
        const missing = question.keywords.filter(kw => !(result.keywordsFound || []).includes(kw));
        feedback.textContent = 'Incorrect. Missing keywords: ' + missing.join(', ');
        feedback.style.color = '#d32f2f';
      }
      // Delay slightly before moving to next question so the user can read feedback
      setTimeout(() => {
        this.handleSubmit(answer);
      }, 800);
    });
    // Use Phaser DOMElement to integrate the container into the scene
    this.domContainer = this.add.dom(GAME_WIDTH / 2, GAME_HEIGHT - 200, container);
  }
  evaluateAnswer(question, userAnswer) {
    // Basic keyword matching. Score is true if at least half of the keywords are present.
    const text = userAnswer.toLowerCase();
    let matched = [];
    let count = 0;
    question.keywords.forEach(kw => {
      const k = kw.toLowerCase();
      if (text.includes(k)) {
        count++;
        matched.push(kw);
      }
    });
    const correct = count >= Math.ceil(question.keywords.length / 2);
    return { correct: correct, keywordsFound: matched };
  }
}

// CalculationScene – player performs numerical calculations. Data is
// presented, user enters an answer. Feedback is given at the end of
// session; the scene stores user answers for later comparison.
class CalculationScene extends QuestionScene {
  constructor() {
    super('calculation');
  }
  createQuestionUI(question) {
    // Update progress bar
    this.updateProgressBar();
    // Reset text objects array for this question
    this.textObjects = [];
    const yStart = 120;
    // Prompt text
    const prompt = this.add.text(50, yStart, question.prompt, {
      fontSize: '18px',
      color: '#000000',
      wordWrap: { width: GAME_WIDTH - 100 }
    });
    this.textObjects.push(prompt);
    // Additional data display if needed. We'll show key data values for clarity.
    const dataText = this.add.text(50, yStart + prompt.height + 10, 'Data: ' + JSON.stringify(question.data), {
      fontSize: '16px',
      color: '#000000'
    });
    this.textObjects.push(dataText);
    // DOM for user input, feedback and controls
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.marginTop = '10px';
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'ui-input';
    input.placeholder = 'Enter your answer';
    container.appendChild(input);
    // Feedback element
    const feedback = document.createElement('p');
    feedback.style.display = 'none';
    feedback.style.fontWeight = 'bold';
    container.appendChild(feedback);
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'ui-button';
    nextBtn.textContent = this.currentIndex === this.questions.length - 1 ? 'Finish Session' : 'Next Question';
    container.appendChild(nextBtn);
    nextBtn.addEventListener('click', () => {
      const value = input.value.trim();
      // Evaluate answer
      const result = this.evaluateAnswer(question, value);
      feedback.style.display = 'block';
      if (result.correct) {
        feedback.textContent = 'Correct!';
        feedback.style.color = '#008000';
      } else {
        feedback.textContent = 'Incorrect. Correct answer: ' + question.answer;
        feedback.style.color = '#d32f2f';
      }
      setTimeout(() => {
        this.handleSubmit(value);
      }, 800);
    });
    this.domContainer = this.add.dom(GAME_WIDTH / 2, GAME_HEIGHT - 160, container);
  }
  evaluateAnswer(question, userAnswer) {
    // Convert user answer to number if possible
    const userVal = parseFloat(userAnswer);
    const correctVal = parseFloat(question.answer);
    // Accept answers within a tolerance of 1% for rounding errors
    const tolerance = Math.abs(correctVal) * 0.01;
    const correct = Math.abs(userVal - correctVal) <= tolerance;
    return { correct: correct };
  }
}

// EssayScene – simplified paper 1 essay mode. The player writes an
// outline answer. At the end of the session, responses are assessed
// based on presence of key concepts. A rubric is displayed.
class EssayScene extends QuestionScene {
  constructor() {
    super('essay');
  }
  createQuestionUI(question) {
    // Update progress bar
    this.updateProgressBar();
    // Reset text objects array for this question
    this.textObjects = [];
    const yStart = 110;
    // Display command term and topic
    const header = this.add.text(50, yStart, `Command Term: ${question.commandTerm}\nTopic: ${question.topic}`, {
      fontSize: '18px',
      color: '#000000'
    });
    this.textObjects.push(header);
    // Display context (if provided) below the header.  Showing context helps
    // the user understand the economic situation they are writing about.
    const contextY = header.y + header.height + 10;
    const contextStr = question.context ? 'Context: ' + question.context : '';
    const contextText = this.add.text(50, contextY, contextStr, {
      fontSize: '16px',
      color: '#000000',
      wordWrap: { width: GAME_WIDTH - 100 }
    });
    this.textObjects.push(contextText);
    // Display the question prompt underneath the context
    const promptY = contextText.y + contextText.height + 10;
    const promptText = this.add.text(50, promptY, 'Question: ' + question.prompt, {
      fontSize: '18px',
      color: '#000000',
      wordWrap: { width: GAME_WIDTH - 100 }
    });
    this.textObjects.push(promptText);
    // Input area with feedback and next button.  Immediate feedback is given
    // when the user clicks Next.
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.marginTop = '10px';
    const textarea = document.createElement('textarea');
    textarea.className = 'ui-textarea';
    textarea.placeholder = 'Outline your answer here...';
    container.appendChild(textarea);
    const feedback = document.createElement('p');
    feedback.style.display = 'none';
    feedback.style.fontWeight = 'bold';
    container.appendChild(feedback);
    const nextBtn = document.createElement('button');
    nextBtn.className = 'ui-button';
    nextBtn.textContent = this.currentIndex === this.questions.length - 1 ? 'Finish Session' : 'Next Question';
    container.appendChild(nextBtn);
    nextBtn.addEventListener('click', () => {
      const answer = textarea.value.trim();
      const result = this.evaluateAnswer(question, answer);
      feedback.style.display = 'block';
      if (result.correct) {
        feedback.textContent = 'Correct!';
        feedback.style.color = '#008000';
      } else {
        const missing = question.keywords.filter(kw => !(result.keywordsFound || []).includes(kw));
        feedback.textContent = 'Incorrect. Missing keywords: ' + missing.join(', ');
        feedback.style.color = '#d32f2f';
      }
      setTimeout(() => {
        this.handleSubmit(answer);
      }, 800);
    });
    this.domContainer = this.add.dom(GAME_WIDTH / 2, GAME_HEIGHT - 170, container);
  }
  evaluateAnswer(question, userAnswer) {
    // Evaluate essay answer: check how many keywords from question.keywords
    // appear in the response. Award correctness if at least half found.
    const text = userAnswer.toLowerCase();
    let matched = [];
    let count = 0;
    question.keywords.forEach(kw => {
      const k = kw.toLowerCase();
      if (text.includes(k)) {
        count++;
        matched.push(kw);
      }
    });
    const correct = count >= Math.ceil(question.keywords.length / 2);
    return { correct: correct, keywordsFound: matched };
  }
  getTitle() {
    return 'Paper 1 – Essay Mode';
  }
}

// CaseStudyScene – simplified paper 2 mode. Presents a scenario with data
// and sub‑questions. The user responds to each part. At the end of the
// session, answers are evaluated qualitatively by keyword presence.
class CaseStudyScene extends QuestionScene {
  constructor() {
    super('case');
  }
  // Override cleanup to destroy case text container as well
  cleanup() {
    // Call base cleanup to destroy domContainer and text objects
    super.cleanup();
    // Destroy case text DOM element if it exists
    if (this.caseDom) {
      this.caseDom.destroy();
      this.caseDom = null;
    }
  }
  createQuestionUI(question) {
    // Update progress bar
    this.updateProgressBar();
    // Reset text objects array for this question
    this.textObjects = [];
    // Create a scrollable DOM container for context, background and data.  This prevents
    // long texts from overflowing and allows the user to scroll through the case study.
    const caseContainer = document.createElement('div');
    caseContainer.style.width = '90%';
    caseContainer.style.margin = '0 auto';
    caseContainer.style.marginTop = '20px';
    caseContainer.style.maxHeight = '250px';
    caseContainer.style.overflowY = 'auto';
    // Context paragraph
    const ctxP = document.createElement('p');
    ctxP.style.fontSize = '18px';
    ctxP.style.fontWeight = 'bold';
    ctxP.textContent = 'Context: ' + question.context;
    caseContainer.appendChild(ctxP);
    // Background paragraph
    const bgP = document.createElement('p');
    bgP.style.fontSize = '16px';
    bgP.textContent = 'Background: ' + question.backgroundText;
    caseContainer.appendChild(bgP);
    // Table if present
    if (question.table && question.table.length > 0) {
      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      const headerRow = document.createElement('tr');
      const keys = Object.keys(question.table[0]);
      keys.forEach(k => {
        const th = document.createElement('th');
        th.textContent = k.charAt(0).toUpperCase() + k.slice(1);
        th.style.border = '1px solid #ccc';
        th.style.padding = '4px';
        th.style.background = '#e7eef5';
        headerRow.appendChild(th);
      });
      table.appendChild(headerRow);
      // Add data rows
      question.table.forEach(row => {
        const tr = document.createElement('tr');
        keys.forEach(k => {
          const td = document.createElement('td');
          td.textContent = row[k];
          td.style.border = '1px solid #ccc';
          td.style.padding = '4px';
          tr.appendChild(td);
        });
        table.appendChild(tr);
      });
      caseContainer.appendChild(table);
    }
    // Add to scene.  Use add.dom to position at left margin.  We save a reference
    // so it can be destroyed in cleanup() when moving to another case.
    this.caseDom = this.add.dom(GAME_WIDTH / 2, 160, caseContainer);
    this.caseDom.setOrigin(0.5, 0);
    // Prepare to ask each sub‑question in sequence
    this.subIndex = 0;
    this.question = question;
    this.createSubQuestionUI();
  }
  createSubQuestionUI() {
    // Remove existing DOM container if any
    if (this.domContainer) {
      this.domContainer.destroy();
      this.domContainer = null;
    }
    const subQ = this.question.subQuestions[this.subIndex];
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.marginTop = '10px';
    const prompt = document.createElement('p');
    prompt.textContent = 'Q' + (this.subIndex + 1) + ': ' + subQ.prompt;
    container.appendChild(prompt);
    const textarea = document.createElement('textarea');
    textarea.className = 'ui-textarea';
    textarea.placeholder = 'Your answer...';
    container.appendChild(textarea);
    // Feedback element for this sub‑question
    const feedback = document.createElement('p');
    feedback.style.display = 'none';
    feedback.style.fontWeight = 'bold';
    container.appendChild(feedback);
    const nextBtn = document.createElement('button');
    nextBtn.className = 'ui-button';
    nextBtn.textContent = this.subIndex === this.question.subQuestions.length - 1 ? 'Submit Case Study' : 'Next Part';
    container.appendChild(nextBtn);
    nextBtn.addEventListener('click', () => {
      const answer = textarea.value.trim();
      // Save answer for this subquestion. Store as part of current question answer list
      if (!Session.answers[this.currentIndex]) {
        Session.answers[this.currentIndex] = [];
      }
      Session.answers[this.currentIndex][this.subIndex] = answer;
      // Evaluate answer based on keyword overlap
      const keywords = subQ.answer.toLowerCase().split(/\W+/);
      const userWords = answer.toLowerCase().split(/\W+/);
      const matches = keywords.filter(k => userWords.includes(k));
      if (!Session.keywordsFound[this.currentIndex]) {
        Session.keywordsFound[this.currentIndex] = [];
      }
      Session.keywordsFound[this.currentIndex][this.subIndex] = matches;
      // Provide immediate feedback: at least one match means correct
      feedback.style.display = 'block';
      if (matches.length > 0) {
        feedback.textContent = 'Correct!';
        feedback.style.color = '#008000';
      } else {
        feedback.textContent = 'Incorrect. A sample correct answer: ' + subQ.answer;
        feedback.style.color = '#d32f2f';
      }
      // After a short delay, proceed to next subquestion or next case
      setTimeout(() => {
        this.subIndex++;
        if (this.subIndex < this.question.subQuestions.length) {
          this.createSubQuestionUI();
        } else {
          // All sub‑questions answered; record time and go to next question or summary
          const now = Date.now();
          const elapsed = now - (Session.lastTimestamp || Session.startTime);
          Session.times.push(elapsed);
          Session.lastTimestamp = now;
          this.currentIndex++;
          if (this.currentIndex < this.questions.length) {
            this.cleanup();
            this.createQuestionUI(this.questions[this.currentIndex]);
          } else {
            Session.endTime = Date.now();
            this.scene.start('SummaryScene');
          }
        }
      }, 800);
    });
    // Position the sub‑question container near the bottom so it does not overlap
    // the case text above.  This helps keep the case study readable and the
    // input fields accessible on all devices.
    this.domContainer = this.add.dom(GAME_WIDTH / 2, GAME_HEIGHT - 150, container);
  }
  evaluateAnswer() {
    // Marking is done per sub‑question; overall correctness is not used here.
    return { correct: false };
  }
  getTitle() {
    return 'Paper 2 – Case Study Mode';
  }
}

// FlashcardScene – timed short questions. This implementation
// sequentially displays Q/A and collects responses. Timing and
// scoring are recorded. A more sophisticated implementation could
// randomise question order and implement a timer countdown.
class FlashcardScene extends QuestionScene {
  constructor() {
    super('flash');
  }
  createQuestionUI(question) {
    // Update progress bar
    this.updateProgressBar();
    // Reset text objects array for this question
    this.textObjects = [];
    const yStart = 180;
    const title = this.add.text(50, yStart, 'Flashcard Question:', {
      fontSize: '20px',
      color: '#000000'
    });
    this.textObjects.push(title);
    const qText = this.add.text(50, yStart + 40, question.question, {
      fontSize: '18px',
      color: '#000000',
      wordWrap: { width: GAME_WIDTH - 100 }
    });
    this.textObjects.push(qText);
    // Input
    const container = document.createElement('div');
    container.style.width = '100%';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'ui-input';
    input.placeholder = 'Answer';
    container.appendChild(input);
    // Feedback element
    const feedback = document.createElement('p');
    feedback.style.display = 'none';
    feedback.style.fontWeight = 'bold';
    container.appendChild(feedback);
    const nextBtn = document.createElement('button');
    nextBtn.className = 'ui-button';
    nextBtn.textContent = this.currentIndex === this.questions.length - 1 ? 'Finish Session' : 'Next';
    container.appendChild(nextBtn);
    nextBtn.addEventListener('click', () => {
      const ans = input.value.trim();
      const result = this.evaluateAnswer(question, ans);
      feedback.style.display = 'block';
      if (result.correct) {
        feedback.textContent = 'Correct!';
        feedback.style.color = '#008000';
      } else {
        feedback.textContent = 'Incorrect. Correct answer: ' + question.answer;
        feedback.style.color = '#d32f2f';
      }
      setTimeout(() => {
        this.handleSubmit(ans);
      }, 800);
    });
    this.domContainer = this.add.dom(GAME_WIDTH / 2, GAME_HEIGHT - 160, container);
  }
  evaluateAnswer(question, userAnswer) {
    const correct = userAnswer.trim().toLowerCase() === question.answer.toLowerCase();
    return { correct: correct };
  }
  getTitle() {
    return 'Flashcard Mode';
  }
}

// SummaryScene – displays a report of the session. Includes accuracy by
// topic, most common errors, time per question and suggested areas for
// targeted revision. This simple implementation focuses on accuracy and
// time; enhancements could include interactive charts.
class SummaryScene extends Phaser.Scene {
  constructor() {
    super('SummaryScene');
  }
  create() {
    this.add.text(GAME_WIDTH / 2, 40, 'Session Summary', { fontSize: '30px', color: '#1e3a8a' }).setOrigin(0.5);

    // Back to menu button on summary screen (top left)
    const backBtn = this.add.text(20, 10, 'Back to Menu', {
      fontSize: '18px',
      backgroundColor: '#1976d2',
      color: '#ffffff',
      padding: { left: 8, right: 8, top: 4, bottom: 4 }
    }).setInteractive({ useHandCursor: true })
      .on('pointerover', () => backBtn.setBackgroundColor('#145a9e'))
      .on('pointerout', () => backBtn.setBackgroundColor('#1976d2'))
      .on('pointerdown', () => {
        this.scene.start('MenuScene');
      });
    // Calculate total correct answers and total time
    const totalQ = Session.questions.length;
    let correctCount = 0;
    Session.correct.forEach(c => { if (Array.isArray(c)) return; if (c) correctCount++; });
    // For case study, each sub‑question is not counted in correct array. We'll count matches length > 0.
    if (Session.mode === 'case') {
      correctCount = 0;
      Session.keywordsFound.forEach(arr => {
        if (Array.isArray(arr)) {
          arr.forEach(subArr => { if (subArr && subArr.length > 0) correctCount++; });
        }
      });
    }
    const totalTime = Session.endTime - Session.startTime;
    const timeSeconds = (totalTime / 1000).toFixed(1);
    // Display overall stats
    const statsText = `Mode: ${Session.mode}\nDifficulty level: ${Session.level}\nQuestions attempted: ${totalQ}\nCorrect responses: ${correctCount}\nTotal time: ${timeSeconds} s`;
    this.add.text(60, 90, statsText, { fontSize: '18px', color: '#333' });
    // Display suggestions based on incorrect answers or missing keywords
    let suggestions = [];
    if (Session.mode === 'diagram' || Session.mode === 'essay') {
      Session.questions.forEach((q, idx) => {
        const missed = q.keywords.filter(kw => !Session.keywordsFound[idx] || !Session.keywordsFound[idx].includes(kw));
        if (missed.length > 0) {
          suggestions.push(`Question ${idx + 1} (${q.topic}): review concepts – missing keywords: ${missed.join(', ')}`);
        }
      });
    }
    if (Session.mode === 'calculation') {
      Session.questions.forEach((q, idx) => {
        const ans = parseFloat(Session.answers[idx]);
        const correct = parseFloat(q.answer);
        if (isNaN(ans) || Math.abs(ans - correct) > Math.abs(correct) * 0.01) {
          suggestions.push(`Question ${idx + 1} (${q.topic}): practise the calculation steps shown in the solution.`);
        }
      });
    }
    if (Session.mode === 'case') {
      Session.questions.forEach((q, idx) => {
        q.subQuestions.forEach((sq, subIdx) => {
          const matches = Session.keywordsFound[idx][subIdx] || [];
          if (matches.length === 0) {
            suggestions.push(`Case Q${idx + 1} Part ${subIdx + 1}: revisit this topic – answer may lack key elements.`);
          }
        });
      });
    }
    if (Session.mode === 'flash') {
      Session.questions.forEach((q, idx) => {
        if (!Session.correct[idx]) {
          suggestions.push(`Flashcard ${idx + 1} (${q.topic}): review this definition.`);
        }
      });
    }
    const sugY = 200;
    this.add.text(60, sugY, 'Suggested revision areas:', { fontSize: '20px', color: '#1e3a8a' });
    if (suggestions.length === 0) {
      this.add.text(60, sugY + 30, 'Great job! You answered all questions correctly or included all keywords.', { fontSize: '16px', color: '#008000' });
    } else {
      suggestions.forEach((line, idx) => {
        this.add.text(60, sugY + 30 + idx * 20, '- ' + line, { fontSize: '16px', color: '#d32f2f' });
      });
    }
    // Button to return to main menu
    const menuBtn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 60, 'Back to Menu', { fontSize: '20px', backgroundColor: '#1976d2', color: '#fff', padding: 10 })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', function () { this.setBackgroundColor('#145a9e'); })
      .on('pointerout', function () { this.setBackgroundColor('#1976d2'); })
      .on('pointerdown', () => {
        this.scene.start('MenuScene');
      });
  }
}

// Configuration for the Phaser game. We enable the DOM plugin to
// integrate HTML elements seamlessly. The parent div is 'game-container'.
const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  dom: {
    createContainer: true
  },
  scene: [BootScene, MenuScene, DiagramScene, CalculationScene, EssayScene, CaseStudyScene, FlashcardScene, SummaryScene],
  backgroundColor: '#f0f3f8'
};

// Start the game when the DOM has loaded. This ensures that the
// container element exists.
window.addEventListener('load', () => {
  new Phaser.Game(config);
});