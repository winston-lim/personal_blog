import { siteConfig } from './lib/site-config'

export default siteConfig({
  // the site's root Notion page (required)
  rootNotionPageId: '2f3bd6977735486cbf8d5af2cdd1f89d',

  // if you want to restrict pages to a single notion workspace (optional)
  // (this should be a Notion ID; see the docs for how to extract this)
  // rootNotionSpaceId: 'fde5ac74eea345278f004482710e1af3',

  // basic site info (required)
  name: 'Winston Lim',
  domain: 'winston-lim.com',
  author: 'Winston Lim',

  // open graph metadata (optional)
  description: 'Personal site of Winston Lim',

  // social usernames (optional)
  // twitter: 'transitive_bs',
  github: 'winston-lim',
  linkedin: 'winston-lim-ch',
  // newsletter: '#', // optional newsletter URL
  // youtube: '#', // optional youtube channel name or `channel/UCGbXXXXXXXXXXXXXXXXXXXXXX`

  // default notion icon and cover images for site-wide consistency (optional)
  // page-specific values will override these site-wide defaults
  // defaultPageIcon: 'https://transitivebullsh.it/page-icon.png',
  // defaultPageCover: 'https://transitivebullsh.it/page-cover.jpg',
  defaultPageCoverPosition: 0.5,

  // whether or not to enable support for LQIP preview images (optional)
  isPreviewImageSupportEnabled: true,

  // whether or not redis is enabled for caching generated preview images (optional)
  // NOTE: if you enable redis, you need to set the `REDIS_HOST` and `REDIS_PASSWORD`
  // environment variables. see the readme for more info
  isRedisEnabled: false,

  // map of notion page IDs to URL paths (optional)
  // any pages defined here will override their default URL paths
  // example:
  //
  // pageUrlOverrides: {
  //   '/foo': '067dd719a912471ea9a3ac10710e7fdf',
  //   '/bar': '0be6efce9daf42688f65c76b89f8eb27'
  // }
  pageUrlOverrides: null,

  // pageUrlAdditions: {
  //   '/the-social-audio-revolution': 'c4deaf33cc924ad7a5b9f69c6ae04a01'
  // },

  // whether to use the default notion navigation style or a custom one with links to
  // important pages
  navigationStyle: 'custom',
  navigationLinks: [
    {
      title: 'Blog',
      pageId: 'c904ce4474ca449c80bec7a5fcc02883'
    },
    {
      title: 'Contact',
      pageId: 'c36b1ee49dbb49579004a7e61dd0f703'
    }
  ]
})
