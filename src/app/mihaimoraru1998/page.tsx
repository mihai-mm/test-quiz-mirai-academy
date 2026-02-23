'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminPage() {
    const [file, setFile] = useState<File | null>(null)
    const [rawText, setRawText] = useState('')
    const [uploadMode, setUploadMode] = useState<'pdf' | 'text'>('pdf')
    const [loading, setLoading] = useState(false)
    const [quizzes, setQuizzes] = useState<any[]>([])
    const [results, setResults] = useState<any[]>([])

    useEffect(() => {
        fetchQuizzes()
        fetchResults()
    }, [])

    async function fetchQuizzes() {
        const { data } = await supabase.from('quizzes').select('*').order('created_at', { ascending: false })
        if (data) setQuizzes(data)
    }

    async function fetchResults() {
        const { data } = await supabase.from('student_results')
            .select('*, quizzes(title)')
            .order('created_at', { ascending: false })
        if (data) setResults(data)
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
        }
    }

    const handleDeleteQuiz = async (id: string) => {
        if (!confirm('Sei sicuro di voler eliminare questo quiz? Tutte le domande e i risultati correlati verranno eliminati.')) return

        setLoading(true)
        try {
            const { error } = await supabase.from('quizzes').delete().eq('id', id)
            if (error) throw error
            alert('Quiz eliminato con successo!')
            fetchQuizzes()
        } catch (error: any) {
            alert(`Errore nell'eliminazione del quiz: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    const handleRenameQuiz = async (id: string, currentTitle: string) => {
        const newTitle = prompt('Inserisci il nuovo titolo del quiz:', currentTitle)
        if (!newTitle || newTitle === currentTitle) return

        setLoading(true)
        try {
            const { error } = await supabase.from('quizzes').update({ title: newTitle }).eq('id', id)
            if (error) throw error
            fetchQuizzes()
        } catch (error: any) {
            alert(`Errore nella rinomina del quiz: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault()
        if (uploadMode === 'pdf' && !file) return
        if (uploadMode === 'text' && !rawText.trim()) return

        setLoading(true)
        const formData = new FormData()
        if (uploadMode === 'pdf' && file) {
            formData.append('file', file)
        } else {
            formData.append('rawText', rawText)
        }

        try {
            const response = await fetch('/api/generate-quiz', {
                method: 'POST',
                body: formData,
            })

            if (response.ok) {
                alert('Quiz generato con successo!')
                setFile(null)
                setRawText('')
                fetchQuizzes()
            } else {
                const errorData = await response.json()
                alert(`Errore: ${errorData.error}`)
            }
        } catch (error) {
            alert('Si è verificato un errore durante l\'upload.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="admin-container">
            <header className="admin-header">
                <h1>Dashboard Docente</h1>
                <p>Carica un PDF o incolla un testo per generare istantaneamente un nuovo quiz da 30 domande.</p>
            </header>

            <div className="admin-card">
                <h2>Genera Nuovo Quiz</h2>

                <div className="admin-tabs">
                    <button
                        className={`tab-button ${uploadMode === 'pdf' ? 'active' : ''}`}
                        onClick={() => setUploadMode('pdf')}
                    >
                        Carica PDF
                    </button>
                    <button
                        className={`tab-button ${uploadMode === 'text' ? 'active' : ''}`}
                        onClick={() => setUploadMode('text')}
                    >
                        Incolla Testo
                    </button>
                </div>

                <form onSubmit={handleUpload} className="upload-form">
                    {uploadMode === 'pdf' ? (
                        <div className="input-group">
                            <label>Seleziona file PDF</label>
                            <input
                                type="file"
                                accept="application/pdf"
                                onChange={handleFileChange}
                                className="file-input"
                                disabled={loading}
                            />
                        </div>
                    ) : (
                        <div className="input-group">
                            <label>Contenuto della Lezione</label>
                            <textarea
                                placeholder="Incolla qui il tuo materiale didattico..."
                                value={rawText}
                                onChange={(e) => setRawText(e.target.value)}
                                className="text-input"
                                disabled={loading}
                            />
                        </div>
                    )}
                    <button type="submit" className="primary-button" disabled={loading || (uploadMode === 'pdf' ? !file : !rawText.trim())}>
                        {loading ? 'Generazione in corso (potrebbe richiedere un minuto)...' : 'Genera Quiz'}
                    </button>
                </form>
            </div>

            <div className="admin-grid">
                <div className="admin-card">
                    <h2>I tuoi Quiz</h2>
                    {quizzes.length === 0 ? (
                        <p className="empty-state">Nessun quiz generato finora.</p>
                    ) : (
                        <ul className="item-list">
                            {quizzes.map((quiz) => (
                                <li key={quiz.id} className="list-item">
                                    <div className="item-content">
                                        <h3>{quiz.title}</h3>
                                        <span className="subtitle">Da: {quiz.source_pdf_name}</span>
                                        <div className="action-buttons">
                                            <button
                                                className="secondary-button"
                                                onClick={() => handleRenameQuiz(quiz.id, quiz.title)}
                                                disabled={loading}
                                            >
                                                Rinomina
                                            </button>
                                            <button
                                                className="delete-button"
                                                onClick={() => handleDeleteQuiz(quiz.id)}
                                                disabled={loading}
                                            >
                                                Elimina
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="admin-card">
                    <h2>Risultati Studenti Recenti</h2>
                    {results.length === 0 ? (
                        <p className="empty-state">Ancora nessun risultato.</p>
                    ) : (
                        <ul className="item-list">
                            {results.map((result) => (
                                <li key={result.id} className="list-item">
                                    <div className="item-content">
                                        <h3>{result.student_name}</h3>
                                        <span className="subtitle">Quiz: {result.quizzes?.title}</span>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
                                            <strong className="score-badge">Punteggio: {result.score}/{result.total_questions}</strong>
                                            <a
                                                href={`/quiz/${result.quiz_id}/results?resultId=${result.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="secondary-button"
                                                style={{ textDecoration: 'none' }}
                                            >
                                                Vedi Risultati Dettagliati
                                            </a>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    )
}
