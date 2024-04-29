import fs from 'fs'
import path from 'path'

const Resume = () => {
  return
}

export const getServerSideProps = async ({ res }) => {
  const dataFilePath = path.join(process.cwd(), 'public', 'uk-resume.pdf')
  const fileContents = fs.readFileSync(dataFilePath)
  res.setHeader('Content-Type', 'application/pdf')
  res.write(fileContents)
  res.end()

  return {
    props: {}
  }
}

export default Resume
