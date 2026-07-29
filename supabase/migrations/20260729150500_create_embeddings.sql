-- Enable the pgvector extension
create extension if not exists vector with schema public;

-- Create the table for storing document chunks and their embeddings
create table if not exists course_embeddings (
  id bigserial primary key,
  course_id text not null,
  file_path text not null, -- The path in the Supabase course_files bucket
  chunk_index integer not null, -- To keep chunks in order
  chunk_text text not null,
  embedding vector(768), -- Google Gemini's text-embedding-004 uses 768 dimensions by default
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add an index for faster similarity searches using cosine distance
create index on course_embeddings using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- Create the similarity search function that we will call from our Next.js backend
create or replace function match_course_embeddings (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  filter_course_id text
)
returns table (
  id bigint,
  file_path text,
  chunk_text text,
  similarity float
)
language sql stable
as $$
  select
    course_embeddings.id,
    course_embeddings.file_path,
    course_embeddings.chunk_text,
    1 - (course_embeddings.embedding <=> query_embedding) as similarity
  from course_embeddings
  where course_embeddings.course_id = filter_course_id
    and 1 - (course_embeddings.embedding <=> query_embedding) > match_threshold
  order by course_embeddings.embedding <=> query_embedding
  limit match_count;
$$;
