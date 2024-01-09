import { marked } from 'marked'

export function markdownToHtml (md) {
  const text = md// .replace('\n', '<br>');
  const regex = /~!(.*)!~/ig
  const noSpoil = text?.replaceAll(regex, '[???]')
  return marked(noSpoil)
}

export function useChapterDotStateClass (chapterState) {
  switch (Number(chapterState)) {
    case 3:
      return 'bg-green-400 ring-green-500'
    case 0:
      return 'bg-red-400 ring-red-500'
    default:
      return 'bg-main-100 ring-main-500'
  }
}
