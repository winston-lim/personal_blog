import { Block } from 'notion-types'
import { defaultMapImageUrl } from 'notion-utils'

import { defaultPageCover, defaultPageIcon } from './config'

export const mapImageUrl = (url: string | null | undefined, block: Block) => {
  if (!url) {
    return ''
  }

  if (url === defaultPageCover || url === defaultPageIcon) {
    return url
  }

  return defaultMapImageUrl(url, block)
}
