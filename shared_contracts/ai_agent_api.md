# AI Agent API Contract

This document defines the API contract between the NotesMind Backend (AI Gateway) and the AI Agent repository.

## 1. Generate Draft
**Endpoint**: `POST /ai/generate-draft`

**Description**: Generates a note sheet draft based on the case details and any attached documents.

### Request Body
```json
{
  "case_id": "string (UUID)",
  "category": "string",
  "amount": "number",
  "purpose": "string",
  "budget_head": "string",
  "justification": "string",
  "attached_documents": [
    {
      "id": "string",
      "filename": "string",
      "doc_type": "string"
    }
  ]
}
```

### Response Body
```json
{
  "draft_text": "string (formatted markdown or html notesheet draft)",
  "citations": [
    {
      "type": "string ('precedent' | 'rule')",
      "id": "string",
      "excerpt": "string",
      "source": "string",
      "confidence": "number (0.0 to 1.0)"
    }
  ],
  "missing_documents": [
    "string (name or type of missing document)"
  ],
  "overall_confidence": "number (0.0 to 1.0)"
}
```

## 2. Analyze Authority (Advisory)
**Endpoint**: `POST /ai/analyze-authority`

**Description**: Evaluates which authorities need to approve this case based on the rules. This is purely advisory; the backend Workflow module makes the actual binding decision.

### Request Body
```json
{
  "case_id": "string (UUID)",
  "category": "string",
  "amount": "number"
}
```

### Response Body
```json
{
  "recommended_chain": ["string (role e.g., 'hod', 'dean')"],
  "reasoning": "string"
}
```
