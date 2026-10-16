"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

/*
 * The colour picked on a product page, shared by the gallery and the variant
 * picker: choosing a colour shows its photo, and clicking a colourway's photo
 * picks that colour. `url` pins a photo with no colour of its own (the
 * packshot) without changing the colour; picking a colour clears it.
 */
type Selection = { colour: string; url: string | null };

const ColourSelectionContext = createContext<{
  selection: Selection;
  select: (selection: Selection) => void;
} | null>(null);

export function ColourSelectionProvider({
  initialColour,
  children,
}: {
  initialColour: string;
  children: ReactNode;
}) {
  const [selection, select] = useState<Selection>({
    colour: initialColour,
    url: null,
  });
  return (
    <ColourSelectionContext value={{ selection, select }}>
      {children}
    </ColourSelectionContext>
  );
}

export function useColourSelection() {
  const context = useContext(ColourSelectionContext);
  if (!context) {
    throw new Error("useColourSelection needs a <ColourSelectionProvider>");
  }
  return context;
}
