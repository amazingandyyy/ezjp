# Contributing to EZJP News

Thank you for your interest in contributing to EZJP News! This document provides guidelines for contributing to the project.

## Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for our commit messages. This leads to more readable messages that are easy to follow when looking through the project history and helps with automated versioning and changelog generation.

### Commit Message Format
Each commit message consists of a **header**, a **body**, and a **footer**. The header has a special format that includes a **type**, a **scope**, and a **subject**:

```
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

The **header** is mandatory and the **scope** of the header is optional.

#### Type
Must be one of the following:

* **feat**: A new feature
* **fix**: A bug fix
* **docs**: Documentation only changes
* **style**: Changes that do not affect the meaning of the code (white-space, formatting, etc)
* **refactor**: A code change that neither fixes a bug nor adds a feature
* **perf**: A code change that improves performance
* **test**: Adding missing tests or correcting existing tests
* **chore**: Changes to the build process or auxiliary tools and libraries such as documentation generation

#### Scope
The scope should be the name of the module affected (as perceived by the person reading the changelog generated from commit messages).

#### Subject
The subject contains a succinct description of the change:

* use the imperative, present tense: "change" not "changed" nor "changes"
* don't capitalize the first letter
* no dot (.) at the end

#### Body
Just as in the **subject**, use the imperative, present tense. The body should include the motivation for the change and contrast this with previous behavior.

#### Footer
The footer should contain any information about **Breaking Changes** and is also the place to reference GitHub issues that this commit **Closes**.

### Examples

```
feat(reader): add kanji hover dictionary lookup

Add a popup dictionary that shows readings and meanings when hovering over kanji characters.
This makes it easier for learners to understand unfamiliar kanji without leaving the article.

Closes #123
```

```
fix(auth): handle Google sign-in errors gracefully

Previously, the app would crash when Google sign-in failed.
Now it shows a user-friendly error message and allows retrying.

Closes #456
```

```
docs(readme): update installation instructions

Update the README with detailed steps for setting up the development environment
and troubleshooting common issues.
```

## Pull Request Process

1. Update the README.md with details of changes to the interface, if applicable.
2. Update the documentation with any new features or changes.
3. The PR may be merged once you have the sign-off of at least one other developer.

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Create a new branch for your changes: `git checkout -b feature/your-feature-name`
5. Make your changes and commit using the convention above
6. Push to your fork and submit a pull request

## Questions?

If you have any questions, please feel free to open an issue for discussion. 