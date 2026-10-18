export const TECHNIQUE_TEXT: Record<string, string> = {
  contradiction: "sets two parts of the State's own record against each other",
  documentary: "relies on a document, exhibit or log entry",
  burden: "argues the State has not proved its case rather than offering a story",
  credibility: "attacks the reliability or interest of a witness",
  procedure: "attacks how the police, lab or lawyers handled the case",
  narrative: "offers an alternative account of the night",
  emotion: "appeals to sympathy, character or consequences",
  concession: "concedes part of the State's case, or argues against the client",
  none: "makes no identifiable argument",
};

export const TECHNIQUE_LABEL: Record<string, string> = {
  contradiction: "contradiction",
  documentary: "document",
  burden: "burden of proof",
  credibility: "credibility",
  procedure: "procedure",
  narrative: "narrative",
  emotion: "sympathy",
  concession: "concession",
  none: "no argument",
};

export const GROUND_LABEL: Record<string, string> = {
  hearsay: "hearsay",
  speculation: "speculation",
  relevance: "relevance",
  foundation: "foundation",
  argumentative: "argumentative",
  none: "none",
};
