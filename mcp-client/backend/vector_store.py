import chromadb
from chromadb.config import Settings
import json
from typing import List, Dict, Any
import os

CHROMA_PERSIST_DIRECTORY = os.getenv("CHROMA_PERSIST_DIRECTORY", "./chroma_db")


class VectorStore:
    def __init__(self):
        self.client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIRECTORY)
        self.collection = self.client.get_or_create_collection(
            name="mcp_functions",
            metadata={"description": "MCP server functions and their descriptions"}
        )

    def add_function(self, function_id: str, name: str, description: str,
                     parameters: Dict[str, Any], server_id: int, server_name: str):
        """Add a function to the vector store"""
        document = f"{name}: {description}"
        metadata = {
            "name": name,
            "description": description,
            "parameters": json.dumps(parameters),
            "server_id": server_id,
            "server_name": server_name
        }

        self.collection.upsert(
            ids=[function_id],
            documents=[document],
            metadatas=[metadata]
        )

    def search_functions(self, query: str, n_results: int = 5) -> List[Dict[str, Any]]:
        """Search for relevant functions based on a query"""
        results = self.collection.query(
            query_texts=[query],
            n_results=n_results
        )

        functions = []
        if results and results['metadatas']:
            for metadata in results['metadatas'][0]:
                functions.append({
                    "name": metadata["name"],
                    "description": metadata["description"],
                    "parameters": json.loads(metadata["parameters"]),
                    "server_id": metadata["server_id"],
                    "server_name": metadata["server_name"]
                })

        return functions

    def delete_server_functions(self, server_id: int):
        """Delete all functions for a specific server"""
        results = self.collection.get(
            where={"server_id": server_id}
        )

        if results and results['ids']:
            self.collection.delete(ids=results['ids'])

    def get_all_functions(self) -> List[Dict[str, Any]]:
        """Get all stored functions"""
        results = self.collection.get()

        functions = []
        if results and results['metadatas']:
            for metadata in results['metadatas']:
                functions.append({
                    "name": metadata["name"],
                    "description": metadata["description"],
                    "parameters": json.loads(metadata["parameters"]),
                    "server_id": metadata["server_id"],
                    "server_name": metadata["server_name"]
                })

        return functions


vector_store = VectorStore()
