import markdownit from 'markdown-it'
import hljs from 'highlight.js'

const md = markdownit({
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (__) { }
    }

    return ''
  }
})

export const markdownRender = (content: string): string => {
  return md.render(content)
}
