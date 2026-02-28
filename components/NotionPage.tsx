import * as React from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'

import cs from 'classnames'
import { Block as NotionBlock, PageBlock } from 'notion-types'
import {
  formatDate,
  getBlockTitle,
  getPageProperty,
  normalizeTitle,
  parsePageId
} from 'notion-utils'
import BodyClassName from 'react-body-classname'
import { NotionRenderer } from 'react-notion-x'
import TweetEmbed from 'react-tweet-embed'
import { useSearchParam } from 'react-use'

import * as config from '@/lib/config'
import * as types from '@/lib/types'
import { mapImageUrl } from '@/lib/map-image-url'
import { getCanonicalPageUrl, mapPageUrl } from '@/lib/map-page-url'
import { useDarkMode } from '@/lib/use-dark-mode'

import { Footer } from './Footer'
import { NotionPageHeader } from './NotionPageHeader'
import { Page404 } from './Page404'
import { PageAside } from './PageAside'
import { PageHead } from './PageHead'
import styles from './styles.module.css'

// -----------------------------------------------------------------------------
// dynamic imports for optional components
// -----------------------------------------------------------------------------

const Code = dynamic(() =>
  import('react-notion-x/build/third-party/code').then(async (m) => {
    // add / remove any prism syntaxes here
    await Promise.all([
      import('prismjs/components/prism-markup-templating.js'),
      import('prismjs/components/prism-markup.js'),
      import('prismjs/components/prism-bash.js'),
      import('prismjs/components/prism-c.js'),
      import('prismjs/components/prism-cpp.js'),
      import('prismjs/components/prism-csharp.js'),
      import('prismjs/components/prism-docker.js'),
      import('prismjs/components/prism-java.js'),
      import('prismjs/components/prism-js-templates.js'),
      import('prismjs/components/prism-coffeescript.js'),
      import('prismjs/components/prism-diff.js'),
      import('prismjs/components/prism-git.js'),
      import('prismjs/components/prism-go.js'),
      import('prismjs/components/prism-graphql.js'),
      import('prismjs/components/prism-handlebars.js'),
      import('prismjs/components/prism-less.js'),
      import('prismjs/components/prism-makefile.js'),
      import('prismjs/components/prism-markdown.js'),
      import('prismjs/components/prism-objectivec.js'),
      import('prismjs/components/prism-ocaml.js'),
      import('prismjs/components/prism-python.js'),
      import('prismjs/components/prism-reason.js'),
      import('prismjs/components/prism-rust.js'),
      import('prismjs/components/prism-sass.js'),
      import('prismjs/components/prism-scss.js'),
      import('prismjs/components/prism-solidity.js'),
      import('prismjs/components/prism-sql.js'),
      import('prismjs/components/prism-stylus.js'),
      import('prismjs/components/prism-swift.js'),
      import('prismjs/components/prism-wasm.js'),
      import('prismjs/components/prism-yaml.js')
    ])
    return m.Code
  })
)

const Collection = dynamic(() =>
  import('react-notion-x/build/third-party/collection').then(
    (m) => m.Collection
  )
)
const Modal = dynamic(
  () =>
    import('react-notion-x/build/third-party/modal').then((m) => {
      m.Modal.setAppElement('.notion-viewport')
      return m.Modal
    }),
  {
    ssr: false
  }
)

const Tweet = ({ id }: { id: string }) => {
  return <TweetEmbed tweetId={id} />
}

const propertyLastEditedTimeValue = (
  { block, pageHeader },
  defaultFn: () => React.ReactNode
) => {
  if (pageHeader && block?.last_edited_time) {
    return `Last updated ${formatDate(block?.last_edited_time, {
      month: 'long'
    })}`
  }

  return defaultFn()
}

const propertyDateValue = (
  { data, schema, pageHeader },
  defaultFn: () => React.ReactNode
) => {
  if (pageHeader && schema?.name?.toLowerCase() === 'published') {
    const publishDate = data?.[0]?.[1]?.[0]?.[1]?.start_date

    if (publishDate) {
      return `${formatDate(publishDate, {
        month: 'long'
      })}`
    }
  }

  return defaultFn()
}

const propertyTextValue = (
  { schema, pageHeader },
  defaultFn: () => React.ReactNode
) => {
  if (pageHeader && schema?.name?.toLowerCase() === 'author') {
    return <b>{defaultFn()}</b>
  }

  return defaultFn()
}

const propertySelectValue = (
  { schema, value, key, pageHeader },
  defaultFn: () => React.ReactNode
) => {
  value = normalizeTitle(value)

  if (pageHeader && schema.type === 'multi_select' && value) {
    return (
      <Link href={`/tags/${value}`} key={key}>
        {defaultFn()}
      </Link>
    )
  }

  return defaultFn()
}

const HeroHeader = dynamic<{ className?: string }>(
  () => import('./HeroHeader').then((m) => m.HeroHeader),
  { ssr: false }
)

const NextLinkAdapter = ({
  href,
  as,
  children,
  ...anchorProps
}: React.PropsWithChildren<{
  href: string
  as?: string
} & React.AnchorHTMLAttributes<HTMLAnchorElement>>) => {
  return (
    <Link href={href} as={as} passHref legacyBehavior>
      <a {...anchorProps}>{children}</a>
    </Link>
  )
}

export const NotionPage: React.FC<types.PageProps> = ({
  site,
  recordMap,
  error,
  pageId,
  tagsPage,
  propertyToFilterName
}) => {
  const lite = useSearchParam('lite')
  const [hasMounted, setHasMounted] = React.useState(false)

  // Some Notion payloads may contain blocks without IDs. Instead of dropping
  // these blocks (which can hide collection content), normalize them by
  // backfilling IDs from block keys.
  const safeRecordMap = React.useMemo(() => {
    if (!recordMap?.block) {
      return recordMap
    }

    const block = Object.fromEntries(
      Object.entries(recordMap.block).map(([blockId, blockEntry]) => {
        if (!blockEntry || typeof blockEntry !== 'object') {
          return [blockId, blockEntry]
        }

        if ('value' in blockEntry) {
          const value = (blockEntry as { value?: NotionBlock }).value

          if (value && typeof value === 'object' && !value.id) {
            return [
              blockId,
              {
                ...(blockEntry as { value?: NotionBlock }),
                value: {
                  ...value,
                  id: blockId
                }
              }
            ]
          }

          return [blockId, blockEntry]
        }

        const value = blockEntry as NotionBlock
        if (value && typeof value === 'object' && !value.id) {
          return [
            blockId,
            {
              ...value,
              id: blockId
            }
          ]
        }

        return [blockId, blockEntry]
      })
    ) as typeof recordMap.block

    return {
      ...recordMap,
      block
    }
  }, [recordMap])

  const components = React.useMemo(
    () => ({
      nextImage: Image,
      nextLink: NextLinkAdapter,
      Code,
      Collection,
      Modal,
      Tweet,
      Header: NotionPageHeader,
      propertyLastEditedTimeValue,
      propertyTextValue,
      propertyDateValue,
      propertySelectValue
    }),
    []
  )

  // lite mode is for oembed
  const isLiteMode = lite === 'true'

  const { isDarkMode } = useDarkMode()
  const effectiveDarkMode = hasMounted ? isDarkMode : false

  React.useEffect(() => {
    setHasMounted(true)
  }, [])

  const siteMapPageUrl = React.useMemo(() => {
    const params: any = {}
    if (lite) params.lite = lite

    const searchParams = new URLSearchParams(params)
    return mapPageUrl(site, safeRecordMap, searchParams)
  }, [site, safeRecordMap, lite])

  const keys = Object.keys(safeRecordMap?.block || {})
  const resolvedPageId = parsePageId(pageId, { uuid: true }) || undefined
  const selectedBlockEntry =
    (resolvedPageId
      ? safeRecordMap?.block?.[resolvedPageId]
      : undefined) ?? safeRecordMap?.block?.[keys[0]]
  const firstBlockEntry = selectedBlockEntry as
    | { value?: NotionBlock }
    | NotionBlock
    | undefined
  const block =
    firstBlockEntry &&
    typeof firstBlockEntry === 'object' &&
    'value' in firstBlockEntry
      ? firstBlockEntry.value
      : (firstBlockEntry as NotionBlock | undefined)

  // const isRootPage =
  //   parsePageId(block?.id) === parsePageId(site?.rootNotionPageId)
  const isBlogPost =
    block?.type === 'page' && block?.parent_table === 'collection'
  const isBioPage =
    parsePageId(block?.id) === parsePageId('8d0062776d0c4afca96eb1ace93a7538')

  const showTableOfContents = !!isBlogPost
  const minTableOfContentsItems = 3

  const pageAside = React.useMemo(
    () => (
      <PageAside
        block={block}
        recordMap={safeRecordMap}
        isBlogPost={isBlogPost}
      />
    ),
    [block, safeRecordMap, isBlogPost]
  )

  const footer = React.useMemo(() => <Footer />, [])

  const pageCover = React.useMemo(() => {
    if (isBioPage) {
      return (
        <HeroHeader className='notion-page-cover-wrapper notion-page-cover-hero' />
      )
    } else {
      return null
    }
  }, [isBioPage])

  if (error || !site || !block) {
    return <Page404 site={site} pageId={pageId} error={error} />
  }

  const name = getBlockTitle(block, safeRecordMap) || site.name
  const title =
    tagsPage && propertyToFilterName ? `${propertyToFilterName} ${name}` : name

  console.log('notion page', {
    isDev: config.isDev,
    title,
    pageId,
    rootNotionPageId: site.rootNotionPageId,
    recordMap
  })

  if (!config.isServer) {
    // add important objects to the window global for easy debugging
    const g = window as any
    g.pageId = pageId
    g.recordMap = recordMap
    g.block = block
  }

  const canonicalPageUrl =
    !config.isDev && getCanonicalPageUrl(site, safeRecordMap)(pageId)

  const socialImage = mapImageUrl(
    getPageProperty<string>('Social Image', block, safeRecordMap) ||
      (block as PageBlock).format?.page_cover ||
      config.defaultPageCover,
    block
  )

  const socialDescription =
    getPageProperty<string>('Description', block, safeRecordMap) ||
    config.description
  const isDevHydrationPass = process.env.NODE_ENV !== 'production' && !hasMounted

  return (
    <>
      <PageHead
        pageId={pageId}
        site={site}
        title={title}
        description={socialDescription}
        image={socialImage}
        url={canonicalPageUrl}
      />

      {isLiteMode && <BodyClassName className='notion-lite' />}
      {hasMounted && isDarkMode && <BodyClassName className='dark-mode' />}

      {isDevHydrationPass ? (
        <div
          className={cs(
            styles.notion,
            pageId === site.rootNotionPageId && 'index-page',
            tagsPage && 'tags-page'
          )}
        />
      ) : (
        <NotionRenderer
          bodyClassName={cs(
            styles.notion,
            pageId === site.rootNotionPageId && 'index-page',
            tagsPage && 'tags-page'
          )}
          darkMode={effectiveDarkMode}
          components={components}
          recordMap={safeRecordMap}
          rootPageId={site.rootNotionPageId}
          rootDomain={site.domain}
          fullPage={!isLiteMode}
          previewImages={!!safeRecordMap.preview_images}
          showCollectionViewDropdown={false}
          showTableOfContents={showTableOfContents}
          minTableOfContentsItems={minTableOfContentsItems}
          defaultPageIcon={config.defaultPageIcon}
          defaultPageCover={config.defaultPageCover}
          defaultPageCoverPosition={config.defaultPageCoverPosition}
          linkTableTitleProperties={false}
          mapPageUrl={siteMapPageUrl}
          mapImageUrl={mapImageUrl}
          searchNotion={null}
          pageAside={pageAside}
          footer={footer}
          pageTitle={tagsPage && propertyToFilterName ? title : undefined}
          pageCover={pageCover}
        />
      )}
    </>
  )
}
