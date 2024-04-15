import fs from 'fs'
import { markdownRender } from './render'
import { Context } from 'koishi'
import { resolve } from 'path'

export const renderImage = async (title: { content: string, sub: string }, message: string, ctx: Context): Promise<string> => {
  const OpenAILogo = fs.readFileSync(resolve(__dirname, './assets/openai.svg'), 'utf8')
  const styleContent = fs.readFileSync(resolve(__dirname, './assets/tabler.min.css'), 'utf8')
  const codeStyleContent = fs.readFileSync(resolve(__dirname, './assets/atom-one-dark.css'), 'utf8')

  const html = `
        <html>
          <style>${styleContent}</style>
          <style>${codeStyleContent}</style>
          <style>
            body {
              background-color: white;
            }
            html, body {
              width: 500px;
              height: auto;
            }
            pre, code {
              max-width: 450px;
              word-wrap: break-word;
              word-break: break-all;
              white-space: pre-wrap;
            }
            #card-stamp-icon svg {
              width: 60px;
              height: 60px;
            }
          </style>
          <div class="card" id="message">
            <div class="card-stamp">
              <div class="card-stamp-icon bg-green" id="card-stamp-icon">${OpenAILogo}</div>
            </div>
            <div class="card-body">
              <h3 class="card-title">
                ${title.content}
                ${title.sub ? `(<small>${title.sub}</small>)` : ''}
              </h3>
              <p class="text-secondary">${markdownRender(message)}</p>
            </div>
          </div>
          <script>
            // set html height width
            window.addEventListener('DOMContentLoaded', () => {
              const message = document.getElementById('message');
              document.getElementsByTagName('html')[0].style.height = message.offsetHeight + 'px';
              document.getElementsByTagName('html')[0].style.width = message.offsetWidth + 'px';
            });
          </script>
        </html>`

  return await ctx.puppeteer.render(html)
}

export const renderText = (message: string): string => {
  return message
}
