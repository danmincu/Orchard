using System.Collections.Generic;
using System.Web.Mvc;
using System.Web.Routing;
using Orchard.Mvc.Routes;

public class Routes : IRouteProvider
{
	public void GetRoutes(ICollection<RouteDescriptor> routes)
	{
		foreach (var routeDescriptor in GetRoutes())
			routes.Add(routeDescriptor);
	}

	public IEnumerable<RouteDescriptor> GetRoutes()
	{
		return new[] {
			new RouteDescriptor {
				Priority = 5,
				Route = new Route(
					"Admin/PlacesField/{controller}/{action}",
					new RouteValueDictionary {
						{"area", "Contrib.PlacesField"},
						{"controller", "Yelp"},
						{"action", "Places"}
					},
					new RouteValueDictionary(),
					new RouteValueDictionary {
						{"area", "Contrib.PlacesField"}
					},
					new MvcRouteHandler())
			}
		};
	}
}
