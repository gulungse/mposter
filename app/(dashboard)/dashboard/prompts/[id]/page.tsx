
import { notFound } from 'next/navigation'
import { getPrompt } from '@/app/actions/prompt'
import EditPrompt from './edit-prompt'

interface PromptEditPageProps {
    params: Promise<{
        id: string
    }>
}

export default async function PromptEditPage({ params }: PromptEditPageProps) {
    const { id } = await params
    const result = await getPrompt(id)

    if (!result.success || !result.data) {
        notFound()
    }

    // Pass only necessary serializable data
    const promptData = {
        id: result.data.id,
        title: result.data.title,
        content: result.data.content
    }

    return <EditPrompt prompt={promptData} />
}
