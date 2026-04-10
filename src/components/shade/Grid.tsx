"use client";

import { useRef, useCallback } from "react";
import { type CellState, isLineComplete } from "@/lib/nonogram";
import ClueBar from "./ClueBar";

interface GridProps {
  grid: CellState[][];
  solution: number[][];
  rowClues: number[][];
  colClues: number[][];
  mode: "shade" | "mark";
  status: "playing" | "won";
  onCellToggle: (row: number, col: number) => void;
  onDragCell: (row: number, col: number) => void;
  onDragEnd: () => void;
}

export default function Grid({
  grid,
  solution,
  rowClues,
  colClues,
  mode,
  status,
  onCellToggle,
  onDragCell,
  onDragEnd,
}: GridProps) {
  const size = grid.length;
  const isDragging = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const getCellFromPointer = useCallback(
    (e: React.PointerEvent): { row: number; col: number } | null => {
      const gridEl = gridRef.current;
      if (!gridEl) return null;

      const rect = gridEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cellWidth = rect.width / size;
      const cellHeight = rect.height / size;
      const col = Math.floor(x / cellWidth);
      const row = Math.floor(y / cellHeight);

      if (row >= 0 && row < size && col >= 0 && col < size) {
        return { row, col };
      }
      return null;
    },
    [size]
  );

  const handlePointerDown = useCallback(
    (row: number, col: number, e: React.PointerEvent) => {
      if (status === "won") return;
      e.preventDefault();
      isDragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      onCellToggle(row, col);
    },
    [status, onCellToggle]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current || status === "won") return;
      const cell = getCellFromPointer(e);
      if (cell) {
        onDragCell(cell.row, cell.col);
      }
    },
    [status, getCellFromPointer, onDragCell]
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
    onDragEnd();
  }, [onDragEnd]);

  const rowCompleted = grid.map((row, r) =>
    isLineComplete(row, solution[r])
  );

  const colCompleted = Array.from({ length: size }, (_, c) => {
    const playerCol = grid.map((row) => row[c]);
    const solutionCol = solution.map((row) => row[c]);
    return isLineComplete(playerCol, solutionCol);
  });

  return (
    <div className="flex flex-col items-center w-full">
      {/* Column clues above the grid */}
      <div className="flex" style={{ paddingLeft: `${size * 14 + 4}px` }}>
        {colClues.map((clues, c) => (
          <div
            key={c}
            className="flex items-end justify-center"
            style={{
              width: `min(calc((100vw - ${size * 14 + 40}px) / ${size}), 56px)`,
            }}
          >
            <ClueBar
              clues={clues}
              completed={status === "won" || colCompleted[c]}
              direction="col"
            />
          </div>
        ))}
      </div>

      {/* Grid rows with row clues */}
      <div className="flex">
        {/* Row clues */}
        <div className="flex flex-col">
          {rowClues.map((clues, r) => (
            <div
              key={r}
              className="flex items-center justify-end"
              style={{
                height: `min(calc((100vw - ${size * 14 + 40}px) / ${size}), 56px)`,
                minWidth: `${size * 14}px`,
              }}
            >
              <ClueBar
                clues={clues}
                completed={status === "won" || rowCompleted[r]}
                direction="row"
              />
            </div>
          ))}
        </div>

        {/* The grid itself */}
        <div
          ref={gridRef}
          className="grid gap-[2px]"
          style={{
            gridTemplateColumns: `repeat(${size}, min(calc((100vw - ${size * 14 + 40}px) / ${size}), 56px))`,
            gridTemplateRows: `repeat(${size}, min(calc((100vw - ${size * 14 + 40}px) / ${size}), 56px))`,
            touchAction: "none",
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const isWon = status === "won";
              const isSolution = solution[r][c] === 1;
              const delay = (r + c) * 60;

              return (
                <button
                  key={`${r}-${c}`}
                  className={`
                    rounded-md flex items-center justify-center select-none
                    transition-all duration-150
                    ${
                      cell === "shaded"
                        ? isWon
                          ? "text-white"
                          : "bg-[#8b5cf6] text-white"
                        : cell === "marked"
                          ? "bg-gray-100 text-gray-400"
                          : "bg-gray-100"
                    }
                    ${!isWon ? "active:scale-95" : ""}
                  `}
                  style={{
                    minWidth: "44px",
                    minHeight: "44px",
                    touchAction: "none",
                    ...(isWon && isSolution
                      ? {
                          backgroundColor: "#8b5cf6",
                          animation: `wave 0.5s ease-in-out ${delay}ms both`,
                        }
                      : isWon && !isSolution
                        ? { backgroundColor: "#f3f4f6" }
                        : {}),
                  }}
                  onPointerDown={(e) => handlePointerDown(r, c, e)}
                  disabled={isWon}
                  aria-label={`Cell ${r + 1},${c + 1}: ${cell}`}
                >
                  {cell === "marked" && !isWon && (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    >
                      <path d="M4 4L12 12" />
                      <path d="M12 4L4 12" />
                    </svg>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
