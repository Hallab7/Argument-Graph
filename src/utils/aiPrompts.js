// AI prompt templates for different analysis tasks

export const FALLACY_DETECTION_PROMPT = `
You are an expert in logical reasoning and critical thinking. Analyze the following text for logical fallacies.

For each fallacy you identify, provide:
1. The type of fallacy (use standard names like "ad hominem", "straw man", "false dichotomy", etc.)
2. A confidence score from 0.0 to 1.0
3. A brief explanation of why this is a fallacy
4. The specific part of the text that contains the fallacy

If no fallacies are found, return an empty array.

Text to analyze: "{text}"

Respond in JSON format:
{
  "fallacies": [
    {
      "type": "fallacy_name",
      "confidence": 0.8,
      "explanation": "Brief explanation",
      "text_excerpt": "The specific problematic text"
    }
  ]
}
`;

export const FACT_CHECK_PROMPT = `
You are a fact-checking expert. You MUST respond with ONLY valid JSON, no other text.

Analyze the following text and identify factual claims that can be verified.

For each claim, provide:
1. The extracted claim
2. A verdict: "true", "false", "partially_true", or "unverifiable"
3. A confidence score from 0.0 to 1.0
4. Brief reasoning for your assessment
5. Suggest reliable sources that could verify this claim

Text to analyze: "{text}"

You MUST respond with EXACTLY this JSON format (no markdown, no extra text):
{
  "claims": [
    {
      "claim": "Extracted factual claim",
      "verdict": "true",
      "confidence": 0.8,
      "reasoning": "Brief explanation of assessment",
      "suggested_sources": ["Source 1", "Source 2"]
    }
  ]
}

IMPORTANT: Return ONLY the JSON object above, nothing else.
`;

export const SUMMARIZATION_PROMPT = `
Summarize this content in {maxLength} words or less using {style} style.

Content: "{content}"

Return only this JSON format:
{"summary": "your summary here", "key_points": ["point 1", "point 2"], "word_count": 25}
`;

export const COUNTER_ARGUMENT_PROMPT = `
You are a skilled debater and critical thinker. You MUST respond with ONLY valid JSON, no other text.

Generate thoughtful counter-arguments to the following argument.

Original argument: "{argument}"
Context: {context}

Generate {maxSuggestions} counter-arguments that:
1. Address different aspects of the original argument
2. Use different types of reasoning (logical, empirical, ethical, practical)
3. Are substantive and well-reasoned
4. Suggest supporting evidence that could strengthen the counter-argument

You MUST respond with EXACTLY this JSON format (no markdown, no extra text):
{
  "counter_arguments": [
    {
      "argument": "The counter-argument text",
      "type": "logical",
      "strength": 0.8,
      "supporting_evidence": ["Evidence 1", "Evidence 2"]
    }
  ]
}

IMPORTANT: Return ONLY the JSON object above, nothing else.
`;

export const ARGUMENT_STRENGTH_PROMPT = `
You are an expert in argumentation and critical thinking. You MUST respond with ONLY valid JSON, no other text.

Analyze the strength of the following argument across multiple criteria.

Argument to analyze: "{argument}"

Evaluate the argument on these criteria (score 0.0 to 1.0):
1. Logical structure and coherence
2. Quality and relevance of evidence
3. Clarity of presentation
4. Relevance to the topic

Also provide:
- Overall strength score
- Main strengths of the argument
- Main weaknesses or areas for improvement
- Specific suggestions for strengthening the argument

You MUST respond with EXACTLY this JSON format (no markdown, no extra text):
{
  "overall_strength": 0.7,
  "criteria_scores": {
    "logic": 0.8,
    "evidence": 0.6,
    "clarity": 0.9,
    "relevance": 0.7
  },
  "strengths": ["Strength 1", "Strength 2"],
  "weaknesses": ["Weakness 1", "Weakness 2"],
  "suggestions": ["Suggestion 1", "Suggestion 2"]
}

IMPORTANT: Return ONLY the JSON object above, nothing else.
`;

// Helper function to replace placeholders in prompts
export const formatPrompt = (template, variables) => {
  let formatted = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    formatted = formatted.replace(new RegExp(placeholder, 'g'), value || '');
  }
  return formatted;
};