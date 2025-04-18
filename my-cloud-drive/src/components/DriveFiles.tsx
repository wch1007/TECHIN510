"use client"
import { useEffect, useState } from "react"
import { fetchDriveFiles } from "@/lib/drive-service"

export default function DriveFiles({ accessToken }: { accessToken: string }) {
  const [files, setFiles] = useState<any[]>([])

  useEffect(() => {
    const getFiles = async () => {
      try {
        const data = await fetchDriveFiles(accessToken)
        setFiles(data.files)
      } catch (err) {
        console.error("Error fetching files", err)
      }
    }
    getFiles()
  }, [accessToken])

  return (
    <ul className="mt-4 list-disc pl-6">
      {files.map((file) => (
        <li key={file.id}>{file.name}</li>
      ))}
    </ul>
  )
}
