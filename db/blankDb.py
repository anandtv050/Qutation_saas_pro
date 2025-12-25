import os,yaml,sys,asyncpg,asyncio

def fnLoadConfig(strConfigFile = 'config.yaml'):
    """Load Configuration from yaml"""
    try:
        with open(strConfigFile,'r') as file:
            config = yaml.safe_load(file)
            return config
    except FileNotFoundError:
        print(f"Error: COnfig file'{strConfigFile}' not found")
        sys.exit(1)
    except yaml.YAMLError as e:
        print(f"Parse Eror:'{e}'")
        sys.exit(1)
        
async def fnCreateDatabase(config):
    """Create Database if doesnt exist"""
    
    try:
       # Connect to default database "postgres"
        conn = await asyncpg.connect(
            user = config['DB_USER'],
            password = config['DB_PASSWORD'],
            host = config['DB_HOST'], 
            port = config['DB_PORT'],
            database ='postgres'
        )
        
        db_name = config['DB_NAME']
        
        # check the db exist or not ? 
        existDb = await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = $1",db_name)
        
        if existDb:
            # delete the db if exist
            print(f"Database '{db_name}' already exists. Dropping the database...")
            await conn.execute(f'DROP DATABASE "{db_name}" WITH (FORCE)')
            print("Database Dropped")

        # Always create the database (either fresh or after dropping)
        print(f"Creating Database '{db_name}'")
        await conn.execute(f'CREATE DATABASE "{db_name}"')
        print("Database Created") 
        await conn.close()
        return True
    except Exception as e:
        print("="*80)
        print(f"Error Creating Database:'{e}'")
        return False

async def fnExecuteSchema(config,schema_file):
    """Execute schema sql"""
    try:
        conn = await asyncpg.connect(
            user = config['DB_USER'],
            password = config['DB_PASSWORD'],
            host = config['DB_HOST'],
            port = config['DB_PORT'],
            database = config['DB_NAME']
        )

        print("Reading Schema File")
        with open(schema_file,'r') as file:
            schema_sql = file.read()

        print("Executing Schema SQL")
        await conn.execute(schema_sql)
        await conn.close()
        return True
    except Exception as e:
        print(f"error while create schema tables'{e}'")
        return False
        
        
async def main():
    """Main Function """

    print("="*50)
    print("BlankDb Db Setup Script")
    print("="*50)

    # change directory into blankDbScript dir
    strScriptDirectory = os.path.dirname(os.path.abspath(__file__))
    os.chdir(strScriptDirectory)

    # Load COnfiguration
    print("config Loading..")
    config = fnLoadConfig('config.yaml')
    print("Config Loaded")
    print(f" Host:'{config['DB_HOST']}'")
    print(f" Database:'{config['DB_NAME']}'")

    ## Create Database
    if not await fnCreateDatabase(config):
        print("Failed to Create Database")
        sys.exit(1)

    # Execute the schema
    schema_file = os.path.join('sql','schema.sql')
    if not await fnExecuteSchema(config,schema_file):
        print("Failed to execute schema")
        sys.exit(1)

    # Execute admin setup (create default admin user)
    admin_setup_file = os.path.join('sql','admin_setup.sql')
    print("\nSetting up Admin User...")
    if not await fnExecuteSchema(config, admin_setup_file):
        print("Failed to execute admin setup")
        sys.exit(1)
    print("Admin user created successfully!")
    # print("  Email: admin@quotely.com")
    # print("  Password: letsGo#B25")

    print("=" * 60)
    print("BlankDb Setup Completed Successfully")
    print("=" * 60)
    
    
if __name__ == "__main__":
    asyncio.run(main())