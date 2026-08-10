---
name: create-skill
description: "Use when you need to turn a repeatable workflow, debugging approach, or review checklist into a reusable skill for this workspace or your personal prompt library."
---

# Create a Reusable Skill

Use this skill when a conversation reveals a multi-step workflow that should be preserved and reused later.

## When to Use

Use this skill if the task involves:
- a repeatable process with several steps
- branching decisions or conditional actions
- quality checks that should be validated before completion
- a workflow worth packaging for future use in this repository or in your personal prompt library

## Goal

Create a useful SKILL.md file that captures:
1. the purpose of the skill
2. when to use it
3. the step-by-step workflow
4. decision points and alternatives
5. completion criteria and validation checks

## Process

1. Review the conversation for the underlying workflow.
   - Identify the main objective.
   - Extract the sequence of actions.
   - Note any decision points, exceptions, or branching logic.

2. Generalize the workflow into a reusable pattern.
   - Remove one-off details.
   - Keep the structure broad enough to apply in future situations.
   - Preserve the key quality standards and verification steps.

3. Draft the skill structure.
   - Include frontmatter with a clear name and description.
   - Add sections for:
     - purpose
     - when to use
     - process
     - decision points
     - completion checklist

4. Make the skill practical.
   - Prefer concise instructions over long prose.
   - Include concrete actions the agent should take.
   - Add examples or trigger phrases where helpful.

5. Validate the result.
   - Confirm the skill is scoped clearly.
   - Check that the workflow is actionable.
   - Ensure the completion criteria are measurable.

## Decision Guidance

- If the workflow is broad and applies across many tasks, make it a general reusable skill.
- If the task is a single focused action with clear inputs, prefer a prompt instead.
- If the workflow needs strong context isolation or role-specific tool restrictions, consider a custom agent instead.

## Completion Checklist

A skill is ready when:
- the purpose is clear
- the trigger conditions are explicit
- the workflow can be followed without extra clarification
- the success criteria are defined
- the content is concise and reusable

## Example Prompt

Use prompts like:
- “Create a skill for my debugging workflow.”
- “Turn this review checklist into a reusable skill.”
- “Package this implementation process into a SKILL.md for this workspace.”
