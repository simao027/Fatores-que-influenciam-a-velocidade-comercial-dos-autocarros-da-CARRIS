import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


try:
    df = pd.read_parquet('df_modelo.parquet')
    
 
    df['dia_semana'] = pd.to_numeric(df['dia_semana'])

except FileNotFoundError:
    print("AVISO: Ficheiro 'df_modelo.parquet' não encontrado. A API irá devolver dados vazios.")
  
    df = pd.DataFrame({
        'route_number': [], 'dia_semana': [], 'classe_hora': [], 
        'classe_chuva': [], 'vmc_kmh': [], 'zona_id': []
    })



def apply_common_filters(df_copy):
    
    dia_semana = request.args.get('dia_semana')
    classe_hora = request.args.get('classe_hora')
    classe_chuva = request.args.get('classe_chuva')
    
    if dia_semana:
        df_copy = df_copy[df_copy['dia_semana'] == int(dia_semana)]
    if classe_hora:
        df_copy = df_copy[df_copy['classe_hora'] == classe_hora]
    if classe_chuva:
        df_copy = df_copy[df_copy['classe_chuva'] == classe_chuva]
        
    return df_copy

#  ENDPOINTS DA API

@app.route('/api/routes', methods=['GET'])
def get_routes():
   
    if df.empty:
        return jsonify([])
    routes = sorted(df['route_number'].unique().tolist())
    return jsonify(routes)


@app.route('/api/data', methods=['GET'])
def get_filtered_data():
   
    if df.empty:
        return jsonify({'kpi_global_avg_speed': 0, 'heatmap_data': []})
    
    filtered_df = apply_common_filters(df.copy())
    
   
    global_avg_speed = filtered_df['vmc_kmh'].mean() if not filtered_df.empty else 0
    
    route_number = request.args.get('route_number')
    if route_number:
        filtered_df = filtered_df[filtered_df['route_number'] == route_number]

    
    if not filtered_df.empty:
        heatmap_df = filtered_df.groupby('zona_id')['vmc_kmh'].mean().reset_index()
        heatmap_data = heatmap_df.to_dict(orient='records')
    else:
        heatmap_data = []
    
    return jsonify({
        'kpi_global_avg_speed': global_avg_speed,
        'heatmap_data': heatmap_data,
    })


@app.route('/api/analytics', methods=['GET'])
def get_analytics():
    
    if df.empty:
        return jsonify({
            'total_routes': 0, 'fast_routes': 0, 'slow_routes': 0,
            'fastest_routes': [], 'slowest_routes': [], 'selection_details': None, 'avg_speed_geral': 0
        })
    
    base_filtered_df = apply_common_filters(df.copy())
    route_number = request.args.get('route_number')

   
    if route_number:
        selection_df = base_filtered_df[base_filtered_df['route_number'] == route_number]
        
        selection_details = None
        if not selection_df.empty:

            stats = selection_df['vmc_kmh'].agg(['mean', 'count'])
            selection_details = {
                'avg_speed': stats['mean'],
                'registos': int(stats['count'])
            }
            
        return jsonify({'selection_details': selection_details})


    else:
       
        avg_speed_geral = base_filtered_df['vmc_kmh'].mean() if not base_filtered_df.empty else 0
        
        
        route_stats = base_filtered_df.groupby('route_number')['vmc_kmh'].agg(['mean', 'count']).reset_index()
        route_stats.rename(columns={'mean': 'avg_speed', 'count': 'registos'}, inplace=True)
     
        total_routes = len(route_stats)
        fast_routes = len(route_stats[route_stats['avg_speed'] > 20])
        slow_routes = len(route_stats[route_stats['avg_speed'] < 10])
        fastest_routes = route_stats.nlargest(10, 'avg_speed')[['route_number', 'avg_speed']].to_dict(orient='records')
        slowest_routes = route_stats.nsmallest(10, 'avg_speed')[['route_number', 'avg_speed']].to_dict(orient='records')
        
        return jsonify({
            'avg_speed_geral': avg_speed_geral,
            'total_routes': total_routes,
            'fast_routes': fast_routes,
            'slow_routes': slow_routes,
            'fastest_routes': fastest_routes,
            'slowest_routes': slowest_routes,
        })


@app.route('/api/charts', methods=['GET'])
def get_chart_data():

    route_number = request.args.get('route_number')
    if df.empty or not route_number:
       
        return jsonify({
            'avg_speed_by_weekday': {'labels': [], 'values': []},
            'avg_speed_by_time_period': {'labels': [], 'values': []},
            'avg_speed_by_weather': {'labels': [], 'values': []}
        })
        
    
    filtered_df = apply_common_filters(df.copy())
    filtered_df = filtered_df[filtered_df['route_number'] == route_number]


    # 1. Gráfico: Velocidade por Dia da Semana
    weekday_map = {0: 'Seg', 1: 'Ter', 2: 'Qua', 3: 'Qui', 4: 'Sex', 5: 'Sáb', 6: 'Dom'}
    weekday_order = list(weekday_map.values())
    speed_by_day = filtered_df.groupby('dia_semana')['vmc_kmh'].mean().rename(index=weekday_map).reindex(weekday_order).fillna(0)
        
    # 2. Gráfico: Velocidade por Período do Dia
    period_order = ['Pico', 'Não Pico']
    speed_by_period = filtered_df.groupby('classe_hora')['vmc_kmh'].mean().reindex(period_order).fillna(0)

    # 3. Gráfico: Velocidade por Meteorologia
    weather_order = ['Sem Chuva', 'Chuva Fraca', 'Chuva Moderada', 'Chuva Forte']
    speed_by_weather = filtered_df.groupby('classe_chuva')['vmc_kmh'].mean().reindex(weather_order).fillna(0)

    return jsonify({
        'avg_speed_by_weekday': {
            'labels': speed_by_day.index.tolist(),
            'values': speed_by_day.values.tolist()
        },
        'avg_speed_by_time_period': {
            'labels': speed_by_period.index.tolist(),
            'values': speed_by_period.values.tolist()
        },
        'avg_speed_by_weather': {
            'labels': speed_by_weather.index.tolist(),
            'values': speed_by_weather.values.tolist()
        }
    })


if __name__ == '__main__':
    app.run(debug=True, port=5000)
