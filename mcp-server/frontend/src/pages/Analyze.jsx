import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PaperAirplaneIcon,
  DocumentTextIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ArrowPathIcon,
  XMarkIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import {
  getConnection,
  getConversation,
  initAnalysis,
  sendMessage,
  generateReport,
  clearConversation,
  bulkCreateCapabilities,
} from '../api';

export default function Analyze() {
  const { connectionId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const [connection, setConnection] = useState(null);
  const [schema, setSchema] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [expandedTables, setExpandedTables] = useState({});
  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState(null);
  const [suggestedCapabilities, setSuggestedCapabilities] = useState([]);

  useEffect(() => {
    loadData();
  }, [connectionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadData = async () => {
    try {
      // Load connection
      const connRes = await getConnection(connectionId);
      setConnection(connRes.data);

      // Check for existing conversation
      const convRes = await getConversation(connectionId);
      if (convRes.data && convRes.data.messages?.length > 0) {
        setMessages(convRes.data.messages);
        if (connRes.data.schema_analysis) {
          setSchema(connRes.data.schema_analysis);
        }
        if (convRes.data.final_report) {
          setReport(convRes.data.final_report);
        }
      } else {
        // Initialize new analysis
        await initializeAnalysis();
      }
    } catch (error) {
      toast.error('Failed to load connection');
      navigate('/analyze');
    } finally {
      setLoading(false);
    }
  };

  const initializeAnalysis = async () => {
    try {
      const res = await initAnalysis(connectionId);
      setSchema(res.data.schema);
      setMessages([
        {
          role: 'assistant',
          content: res.data.initial_message,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to initialize analysis');
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);

    try {
      const res = await sendMessage(connectionId, userMessage.content);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.data.message.content,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send message');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      const res = await generateReport(connectionId);
      setReport(res.data.report);
      setSuggestedCapabilities(res.data.suggested_capabilities || []);
      setShowReport(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleCreateCapabilities = async () => {
    if (suggestedCapabilities.length === 0) {
      toast.error('No capabilities to create');
      return;
    }

    try {
      const capabilities = suggestedCapabilities.map((cap) => ({
        ...cap,
        connection_id: parseInt(connectionId),
      }));
      await bulkCreateCapabilities(capabilities);
      toast.success(`Created ${capabilities.length} capabilities`);
      setShowReport(false);
      navigate('/capabilities');
    } catch (error) {
      toast.error('Failed to create capabilities');
    }
  };

  const handleClearConversation = async () => {
    if (!window.confirm('Are you sure you want to clear this conversation?')) return;

    try {
      await clearConversation(connectionId);
      setMessages([]);
      setReport(null);
      await initializeAnalysis();
      toast.success('Conversation cleared');
    } catch (error) {
      toast.error('Failed to clear conversation');
    }
  };

  const toggleTable = (tableName) => {
    setExpandedTables((prev) => ({
      ...prev,
      [tableName]: !prev[tableName],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex space-x-2">
          <div className="w-2 h-2 bg-accent-500 rounded-full loading-dot"></div>
          <div className="w-2 h-2 bg-accent-500 rounded-full loading-dot"></div>
          <div className="w-2 h-2 bg-accent-500 rounded-full loading-dot"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex gap-6">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white rounded-card shadow-card overflow-hidden">
        {/* Chat Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-text-primary">{connection?.name}</h2>
            <p className="text-xs text-text-secondary">{connection?.db_type}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearConversation}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Clear conversation"
            >
              <ArrowPathIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`chat-message flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-accent-600 text-white rounded-br-md'
                    : 'bg-gray-100 text-text-primary rounded-bl-md'
                }`}
              >
                <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : ''}`}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full loading-dot"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full loading-dot"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full loading-dot"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-100">
          <form onSubmit={handleSend} className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your database..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </form>
          {messages.length >= 2 && (
            <button
              onClick={handleGenerateReport}
              disabled={generatingReport}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent-100 text-accent-700 rounded-lg hover:bg-accent-200 transition-colors disabled:opacity-50"
            >
              <DocumentTextIcon className="w-5 h-5" />
              {generatingReport ? 'Generating Report...' : 'Generate Report'}
            </button>
          )}
        </div>
      </div>

      {/* Schema Explorer */}
      <div className="w-80 bg-white rounded-card shadow-card overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-text-primary">Schema Explorer</h3>
          <span className="text-xs text-text-secondary">
            {schema?.tables?.length || 0} tables
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {schema?.tables?.map((table) => (
            <div key={table.name} className="mb-1">
              <button
                onClick={() => toggleTable(table.name)}
                className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded text-left"
              >
                {expandedTables[table.name] ? (
                  <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                )}
                <span className="font-medium text-sm text-text-primary">{table.name}</span>
                {table.row_count !== null && (
                  <span className="text-xs text-text-secondary ml-auto">
                    {table.row_count.toLocaleString()} rows
                  </span>
                )}
              </button>
              {expandedTables[table.name] && (
                <div className="ml-6 pl-2 border-l border-gray-200">
                  {table.columns?.map((col) => (
                    <div
                      key={col.name}
                      className="flex items-center gap-2 px-2 py-1 text-sm"
                    >
                      <span className={col.primary_key ? 'font-medium text-accent-600' : 'text-text-secondary'}>
                        {col.name}
                      </span>
                      <span className="text-xs text-gray-400">{col.type}</span>
                      {col.primary_key && (
                        <span className="text-xs bg-accent-100 text-accent-600 px-1 rounded">PK</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Report Modal */}
      {showReport && report && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8">
          <div className="bg-white rounded-card shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">Analysis Report</h2>
              <button
                onClick={() => setShowReport(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{report}</ReactMarkdown>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(report);
                  toast.success('Report copied to clipboard');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Copy Report
              </button>
              {suggestedCapabilities.length > 0 && (
                <button
                  onClick={handleCreateCapabilities}
                  className="flex items-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
                >
                  <BoltIcon className="w-5 h-5" />
                  Create {suggestedCapabilities.length} Capabilities
                </button>
              )}
              <button
                onClick={() => setShowReport(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
