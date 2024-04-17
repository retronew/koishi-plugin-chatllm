import { Schema } from 'koishi'
import { BaseModel } from '../base'
import {
  Config as BaseConfig,
  extractPrefixConfig,
  prefixConfig,
} from '../types'
import fs from 'fs'
import { resolve } from 'path'

class Kimi extends BaseModel {
  constructor(config: Kimi.Config) {
    const currentConfig = extractPrefixConfig(config, 'kimi')
    const pictureConfig = {
      logo: fs.readFileSync(
        resolve(__dirname, '../../assets/kimi.svg'),
        'utf8'
      ),
      logoColor: 'blue',
    }
    super({ ...currentConfig, pictureConfig })
  }
}

namespace Kimi {
  export interface SchemaConfig extends BaseConfig {
    useSearch: boolean
  }

  export interface Config extends SchemaConfig {}

  export const SchemaConfig: Schema = Schema.object(
    prefixConfig(
      {
        apiKey: Schema.string()
          .required()
          .description(
            'Moonshot API Key: https://platform.moonshot.cn/console'
          ),
        endpoint: Schema.string()
          .default('https://api.moonshot.cn/v1')
          .description('API 请求地址。'),
        model: Schema.string().default('kimi').description('模型名称。'),
        parseImages: Schema.boolean()
          .default(false)
          .description('是否解析图片内容。'),
        parseFiles: Schema.boolean()
          .default(false)
          .description('是否解析文档内容。'),
        useSearch: Schema.boolean()
          .default(false)
          .description('是否使用搜索引擎来获取回答。'),
        maxContextLength: Schema.number()
          .default(200000)
          .description('最大上下文长度，用于限制对话历史记录的长度。'),
        forgetTime: Schema.number()
          .default(60 * 60 * 1000)
          .description('上下文的遗忘时间，单位为毫秒。'),
        stop: Schema.array(String).description(
          '生成的文本将在遇到任何一个停止标记时停止。'
        ),
      },
      'kimi'
    )
  ).description('Kimi 配置')
}

export default Kimi
