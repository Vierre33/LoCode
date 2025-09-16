export default defineNuxtRouteMiddleware(async (to, from) => {
    // const token = useCookie("token");
    // const publicRoutes = ["/", "/login", "/signup"];
    // const adminRoutes = ["/refresh", "/clear"];

    // if (!token.value) {
    //     if (publicRoutes.includes(to.path))
    //         return;
    //     return from.path === to.path ? navigateTo("/", { replace: true }) : abortNavigation();
    // }
    // try {
    //     const role = await $fetch("/api/token", {
    //         method: "GET",
    //         headers: {
    //             "X-Group-Authorization": token.value
    //         }
    //     });
    //     if (publicRoutes.includes(to.path))
    //         return from.path === to.path ? navigateTo("/home", { replace: true }) : abortNavigation();

    //     if (adminRoutes.includes(to.path)) {
    //         if (role !== "admin")
    //             return from.path === to.path ? navigateTo("/home", { replace: true }) : abortNavigation();

    //         const url = "/api/" + (to.path === "/clear" ? "dropDb" : "fillDb");
    //         await $fetch(url, {
    //             method: "GET",
    //             headers: {
    //                 "X-Group-Authorization": token.value
    //             }
    //         });
    //         return abortNavigation();
    //     }
    // } catch {
    //     if (!publicRoutes.includes(to.path))
    //         return navigateTo("/", { replace: true });
    // }
});
