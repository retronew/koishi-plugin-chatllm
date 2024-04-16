import fs from 'fs'
import { resolve } from 'path'
import { markdownRender } from './render'
import { Context } from 'koishi'
import { Config } from './llm'
import { isRgb, isRgba, isHsl, isHsla, isHex } from 'is-color'

const isColor = (str: string | undefined | null): boolean => {
  return isRgb(str) || isRgba(str) || isHsl(str) || isHsla(str) || isHex(str)
}

export const renderImage = async (
  title: string,
  message: string,
  ctx: Context,
  config: Config
): Promise<string> => {
  const styleContent = fs.readFileSync(
    resolve(__dirname, './assets/tabler.min.css'),
    'utf8'
  )
  const codeStyleContent = fs.readFileSync(
    resolve(__dirname, './assets/atom-one-dark.css'),
    'utf8'
  )

  const isColorString = isColor(config.pictureConfig?.logoColor)
  const cardStampClass = isColorString
    ? ''
    : `bg-${config.pictureConfig?.logoColor}`
  const cardStampStyle = isColorString
    ? `style="background-color: ${config.pictureConfig?.logoColor}"`
    : ''

  const html = `
        <html>
          <style>${styleContent}</style>
          <style>${codeStyleContent}</style>
          <style>
            body {
              background-color: transparent;
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
              <div class=" card-stamp-icon ${cardStampClass}"
              ${cardStampStyle}
              id="card-stamp-icon">${config.pictureConfig?.logo}</div>
            </div>
            <div class="card-body">
              <h3 class="card-title">
                ${title}
                ${config.model ? `(<small>${config.model}</small>)` : ''}
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
