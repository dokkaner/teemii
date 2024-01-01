# Contributing to Teemii

All help is welcome and greatly appreciated! If you would like to contribute to the project, the following instructions should get you started...

## Development

### Tools Required

- HTML/Typescript/Javascript editor
- [Node.js](https://nodejs.org/en/download/) (Node 18.x or higher)
- [NPM](https://www.npmjs.com/get-npm) (NPM 7.x or higher)
- [Docker](https://www.docker.com/) (optional)
- [Git](https://git-scm.com/downloads)

### Getting Started

1. [Fork](https://help.github.com/articles/fork-a-repo/) the repository to your own GitHub account and [clone](https://help.github.com/articles/cloning-a-repository/) it to your local device:

   ```bash
   git clone https://github.com/YOUR_USERNAME/teemi.git
   cd teemii/
   ```

2. Add the remote `upstream`:

   ```bash
   git remote add upstream https://github.com/dokkaner/teemii.git
   ```

3. Create a new branch:

   ```bash
   git checkout -b BRANCH_NAME develop
   ```

    - It is recommended to give your branch a meaningful name, relevant to the feature or fix you are working on.
        - Good examples:
            - `feature-new-agent`
            - `feature-new-system`
            - `fix-cbz-import`
        - Bad examples:
            - `bug`
            - `docs`
            - `feature`
            - `fix`
            - `patch`

4. Run the development environment:

   ```bash
    # For the backend
    cd server
    npm install
    npm run start dev
    
    # For the frontend
    cd app
    npm install
    npm run dev
   ```

    - Alternatively, you can use [Docker](https://www.docker.com/) with `docker-compose up -d`. This method does not require installing Node.js or NPM on your machine directly.

5. Create your patch and test your changes.

    - Be sure to follow both the [code](#contributing-code) and [UI text](#ui-text-style) guidelines.
    - Should you need to update your fork, you can do so by rebasing from `upstream`:
      ```bash
      git fetch upstream
      git rebase upstream/develop
      git push origin BRANCH_NAME -f
      ```

### Contributing Code

- If you are taking on an existing bug or feature ticket, please comment on the [issue](https://github.com/dokkaner/teemii/issues) to avoid multiple people working on the same thing.
- All commits **must** follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
    - Pull requests with commits not following this standard will **not** be merged.
- Please make meaningful commits, or squash them prior to opening a pull request.
    - Do not squash commits once people have begun reviewing your changes.
- Always rebase your commit to the latest `develop` branch. Do **not** merge `develop` into your branch.
- It is your responsibility to keep your branch up-to-date. Your work will **not** be merged unless it is rebased off the latest `develop` branch.
- You can create a "draft" pull request early to get feedback on your work.
- Your code **must** be formatted correctly, or the tests will fail.
    - We use Prettier to format our code base. It should automatically run with a Git hook, but it is recommended to have the Prettier extension installed in your editor and format on save.
- If you have questions or need help, you can reach out via [Discussions](https://github.com/dokkaner/teemii/discussions).
- Only open pull requests to `develop`, never `master`! Any pull requests opened to `master` will be closed.

### UI Text Style

When adding new UI text, please try to adhere to the following guidelines:

1. Be concise and clear, and use as few words as possible to make your point.
2. Use the Oxford comma where appropriate.
3. Use the appropriate Unicode characters for ellipses, arrows, and other special characters/symbols.
4. Capitalize proper nouns, such as Mangadex, Kitsu, Telegram, etc. Be sure to also use the official capitalization for any abbreviations.
5. Title case headings, button text, and form labels. Note that verbs such as "is" should be capitalized, whereas prepositions like "from" should be lowercase (unless as the first or last word of the string, in which case they are also capitalized).
6. Capitalize the first word in validation error messages, dropdowns, and form "tips." These strings should not end in punctuation.
7. Ensure that toast notification strings are complete sentences ending in punctuation.
8. In full sentences, abbreviations like "info" or "auto" should not be used in place of full words, unless referencing the name/label of a specific setting or option which has an abbreviation in its name.
9. Do your best to check for spelling errors and grammatical mistakes.
10. Do not misspell "Teemii."

## Attribution

This contribution guide was inspired by the [Next.js](https://github.com/vercel/next.js) and [Overseer](https://github.com/sct/overseerr) contribution guides.