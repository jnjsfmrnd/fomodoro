# Fomodoro

A vintage PlayStation 1 inspired, gamified Pomodoro timer built to keep you on task while maintaining a retro aesthetic.

## Features

* **Gamified Time Management**: Track tasks with built-in segment times (e.g., 25m/5m, 50m/10m) and earn completion logic similar to an RPG.
* **Retro PS1 Aesthetics**: Custom UI mimicking classic PlayStation 1 menus, featuring CRT-styled timer displays, drop-shadowed block layouts, and bold primary colors.
* **Animated Dashchund Companion**: Focus alongside an animated dachshund companion that reacts to your current state (running during work segments, eating/resting during breaks, panting when paused) via custom CSS sprite-sheet animations.
* **Persistent Tasks**: LocalStorage integration to ensure your tasks and timer state survive page reloads.

## Tech Stack

* **HTML5**: Semantic structure.
* **CSS3**: Pure custom CSS for the retro formatting, CRT styling, and keyframe animations for the sprite sheet logic—no external UI frameworks.
* **Vanilla JavaScript**: State management, local storage interactions, and timer progression logic.

## Usage

1. Add your task via the "Add Task" panel. Specify the task name, expected hours, and segment type.
2. Hit **START** on a task in the list.
3. Keep the Fomodoro window open and watch the CRT styled timer count down while the Dachshund runs.
4. When the work segment finishes, enjoy a break while your dog eats. 
5. Complete all assigned hours to clear the task.

> Note: Try removing a task to see an easter egg password prompt!