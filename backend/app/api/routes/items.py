"""
Example API routes for items

This is a template showing common CRUD patterns for Databricks Apps.
Replace with your actual domain logic and endpoints.
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from app.models.schemas import ItemListResponse, ItemDetail
from app.repositories.databricks_repo import databricks_repo
from app.core.config import settings

router = APIRouter(prefix="/items", tags=["items"])


@router.get("", response_model=ItemListResponse)
async def list_items(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    sort_by: str = Query("created_at", description="Field to sort by"),
    sort_order: str = Query("DESC", regex="^(ASC|DESC)$")
):
    """
    Get paginated list of items

    Example endpoint showing pagination pattern for Unity Catalog tables.
    Replace with your actual table name and logic.
    """
    # Calculate offset for pagination
    offset = (page - 1) * page_size

    # Example query - replace 'items' with your actual table name
    # items_data = databricks_repo.get_table_data(
    #     "items",
    #     limit=page_size,
    #     offset=offset,
    #     order_by=f"{sort_by} {sort_order}"
    # )

    # Example: Get total count
    # total = databricks_repo.get_count("items")

    # For now, return empty response (replace with actual logic)
    return ItemListResponse(
        items=[],
        total=0,
        page=page,
        page_size=page_size,
        has_more=False
    )


@router.get("/{item_id}", response_model=ItemDetail)
async def get_item(item_id: str):
    """
    Get a single item by ID

    Example endpoint showing single record retrieval.
    """
    # Example query - replace with your actual logic
    # query = f"""
    #     SELECT * FROM {settings.CATALOG}.{settings.SCHEMA}.items
    #     WHERE id = :item_id
    # """
    # results = databricks_repo.execute_query(query, {"item_id": item_id})

    # if not results:
    #     raise HTTPException(status_code=404, detail=f"Item {item_id} not found")

    # return ItemDetail(**results[0])

    # Placeholder response
    raise HTTPException(status_code=404, detail="Item not found")


@router.post("", response_model=ItemDetail, status_code=201)
async def create_item(item: ItemDetail):
    """
    Create a new item

    Note: For write operations to Unity Catalog, you may need to use:
    - MERGE statements for upserts
    - Databricks SDK for Delta table operations
    - Or write to a staging table and process via notebook/job
    """
    # Implement your create logic here
    raise HTTPException(status_code=501, detail="Create operation not implemented")


@router.put("/{item_id}", response_model=ItemDetail)
async def update_item(item_id: str, item: ItemDetail):
    """Update an existing item"""
    # Implement your update logic here
    raise HTTPException(status_code=501, detail="Update operation not implemented")


@router.delete("/{item_id}", status_code=204)
async def delete_item(item_id: str):
    """Delete an item"""
    # Implement your delete logic here
    raise HTTPException(status_code=501, detail="Delete operation not implemented")
