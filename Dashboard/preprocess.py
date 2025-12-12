import pandas as pd
import os

CSV_FILE_PATH = 'df_modelo_export.csv' 
PARQUET_FILE_PATH = 'df_modelo.parquet'

def convert_csv_to_parquet():
    
        df = pd.read_csv(CSV_FILE_PATH)       
        if 'route_number' in df.columns:
            df['route_number'] = df['route_number'].astype(str)    
        df.to_parquet(PARQUET_FILE_PATH, engine='pyarrow')
    
if __name__ == '__main__':
    convert_csv_to_parquet()
