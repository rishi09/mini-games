export type CellState = "empty" | "shaded" | "marked";

export function computeClues(grid: number[][]): {
  rowClues: number[][];
  colClues: number[][];
} {
  const size = grid.length;
  const rowClues: number[][] = [];
  const colClues: number[][] = [];

  for (let r = 0; r < size; r++) {
    rowClues.push(getLineClues(grid[r]));
  }

  for (let c = 0; c < size; c++) {
    const col: number[] = [];
    for (let r = 0; r < size; r++) {
      col.push(grid[r][c]);
    }
    colClues.push(getLineClues(col));
  }

  return { rowClues, colClues };
}

function getLineClues(line: number[]): number[] {
  const clues: number[] = [];
  let count = 0;
  for (const cell of line) {
    if (cell === 1) {
      count++;
    } else {
      if (count > 0) {
        clues.push(count);
        count = 0;
      }
    }
  }
  if (count > 0) {
    clues.push(count);
  }
  return clues.length > 0 ? clues : [0];
}

export function checkWin(
  playerGrid: CellState[][],
  solution: number[][]
): boolean {
  const size = solution.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const isShaded = playerGrid[r][c] === "shaded";
      const shouldBeShaded = solution[r][c] === 1;
      if (isShaded !== shouldBeShaded) {
        return false;
      }
    }
  }
  return true;
}

export function isLineComplete(
  playerLine: CellState[],
  solutionLine: number[]
): boolean {
  const playerClues = getLineClues(
    playerLine.map((c) => (c === "shaded" ? 1 : 0))
  );
  const targetClues = getLineClues(solutionLine);
  if (playerClues.length !== targetClues.length) return false;
  return playerClues.every((v, i) => v === targetClues[i]);
}
