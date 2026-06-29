-- Environment layers persistence
-- We keep physical and logical layers separate, and map Camunda process definitions to logical layers.

create table if not exists ENV_PHYSICAL_LAYER (
  ID varchar(36) primary key,
  CREATED_AT timestamp not null,
  SOURCE varchar(255),
  DEPLOYMENT_ID varchar(64),
  RESOURCE_NAME varchar(255),
  PHYSICAL_PLACES_JSON clob not null,
  EDGES_JSON clob not null
);

create table if not exists ENV_LOGICAL_LAYER (
  ID varchar(36) primary key,
  CREATED_AT timestamp not null,
  SOURCE varchar(255),
  DEPLOYMENT_ID varchar(64),
  RESOURCE_NAME varchar(255),
  PHYSICAL_LAYER_ID varchar(36) not null,
  LOGICAL_PLACES_JSON clob not null,
  VIEWS_JSON clob not null,
  constraint FK_ENV_LOGICAL_PHYSICAL foreign key (PHYSICAL_LAYER_ID) references ENV_PHYSICAL_LAYER(ID)
);

-- Collaboration reference: a deployment is associated with a logical layer (the one deployed together)
create table if not exists ENV_COLLABORATION_LAYER (
  DEPLOYMENT_ID varchar(64) primary key,
  LOGICAL_LAYER_ID varchar(36) not null,
  CREATED_AT timestamp not null,
  constraint FK_ENV_COLLAB_LOGICAL foreign key (LOGICAL_LAYER_ID) references ENV_LOGICAL_LAYER(ID)
);

-- Process definition reference: each process definition points to the logical layer it was deployed with
create table if not exists ENV_PROCESS_DEFINITION_LAYER (
  PROCESS_DEFINITION_ID varchar(128) primary key,
  DEPLOYMENT_ID varchar(64) not null,
  LOGICAL_LAYER_ID varchar(36) not null,
  CREATED_AT timestamp not null,
  constraint FK_ENV_PDL_LOGICAL foreign key (LOGICAL_LAYER_ID) references ENV_LOGICAL_LAYER(ID)
);

create index if not exists IDX_ENV_PDL_DEPLOYMENT on ENV_PROCESS_DEFINITION_LAYER(DEPLOYMENT_ID);
create index if not exists IDX_ENV_LOGICAL_PHYSICAL on ENV_LOGICAL_LAYER(PHYSICAL_LAYER_ID);

