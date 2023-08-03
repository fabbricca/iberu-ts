from app.api import bp


@bp.route('/lightweight_chart', methods=['POST'])
def lightweight_chart():
  html = f'''<script src="/static/node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.js"></script>'''
  return html